import Stripe from 'stripe';
import { AppDataSource } from '../database';
import { SubscriptionEntity } from '../entities/Subscription';
import { ParentEntity } from '../entities/Parent';
import { PlanId, PLAN_LIMITS, PlanLimits } from '../config/plans';
import { emailService } from './email.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20' as any,
});

const subRepo = () => AppDataSource.getRepository(SubscriptionEntity);
const parentRepo = () => AppDataSource.getRepository(ParentEntity);

export class SubscriptionService {
  // ─── Trial Creation ───────────────────────────────────────────────────────

  /** Called from auth.service.ts immediately after a new parent is saved. */
  async createTrialSubscription(parentId: string): Promise<SubscriptionEntity> {
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sub = subRepo().create({
      parentId,
      plan: 'trial',
      status: 'trialing',
      trialEndsAt,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
    return subRepo().save(sub);
  }

  // ─── Retrieval ────────────────────────────────────────────────────────────

  /** Returns the subscription for a parent, auto-expiring the trial if needed.
   *
   *  If no subscription row exists for a valid parent (e.g. accounts registered
   *  before the subscription system was introduced, or where the trial-creation
   *  call failed silently at sign-up), one is created automatically so the user
   *  is never stuck with a hard "Subscription record not found" error.
   */
  async getSubscription(parentId: string): Promise<SubscriptionEntity | null> {
    let sub = await subRepo().findOne({ where: { parentId } });

    if (!sub) {
      // Only backfill for parents that actually exist in the DB.
      const parent = await parentRepo().findOne({ where: { id: parentId } });
      if (!parent) return null;

      console.warn(`[Subscription] No subscription found for parent ${parentId} — auto-creating trial.`);
      sub = await this.createTrialSubscription(parentId);
    }

    if (sub.status === 'trialing' && sub.trialEndsAt && sub.trialEndsAt < new Date()) {
      sub.status = 'incomplete';
      await subRepo().save(sub);
    }

    return sub;
  }

  /**
   * Returns the effective plan to use for limit checks.
   * Returns null if the user has no active/trial subscription (paywalled).
   */
  getEffectivePlan(sub: SubscriptionEntity | null): PlanId | null {
    if (!sub) return 'trial'; // Defensive: parents with no subscription record get trial access
    if (sub.status === 'trialing' && sub.trialEndsAt && sub.trialEndsAt > new Date()) {
      return 'trial';
    }
    if (sub.status === 'active' || sub.status === 'past_due') {
      return sub.plan as PlanId;
    }
    return null;
  }

  // ─── Limit Checks ─────────────────────────────────────────────────────────

  /** Returns { allowed, limit } for any plan feature key. */
  async checkLimit(
    parentId: string,
    key: keyof PlanLimits,
  ): Promise<{ allowed: boolean; limit: number | boolean }> {
    const sub = await this.getSubscription(parentId);
    const planId = this.getEffectivePlan(sub);

    if (!planId) return { allowed: false, limit: 0 };

    const limits = PLAN_LIMITS[planId];
    const value = limits[key] as number | boolean | string | undefined;

    if (typeof value === 'boolean') return { allowed: value, limit: value };
    if (typeof value === 'number') return { allowed: value > 0, limit: value };
    return { allowed: false, limit: 0 };
  }

  // ─── Stripe Subscription Creation ─────────────────────────────────────────

  /**
   * Creates a Stripe Customer (if needed) + Subscription in `default_incomplete` mode.
   * Returns the clientSecret for Stripe Payment Sheet.
   * Accepts an optional promoCode (influencer referral code) to apply a discount coupon.
   */
  async createStripeSubscription(
    parentId: string,
    priceId: string,
    promoCode?: string,
  ): Promise<{ clientSecret: string; discountApplied?: number }> {
    const parent = await parentRepo().findOne({ where: { id: parentId } });
    if (!parent) throw new Error('Parent not found');

    // getSubscription() auto-creates a trial record for any valid parent,
    // so sub will only be null here if the parentId itself doesn't exist
    // (already guarded by the 'Parent not found' check above).
    const sub = await this.getSubscription(parentId);
    if (!sub) throw new Error('Parent account not found');

    // Validate the priceId is one we recognise
    const knownPriceIds = Object.values(PLAN_LIMITS)
      .map(p => p.priceId)
      .filter(Boolean);
    if (!knownPriceIds.includes(priceId)) {
      throw new Error('Invalid plan selected');
    }

    // Create Stripe customer if not already created
    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: parent.email,
        name: parent.name,
        metadata: { parentId },
      });
      customerId = customer.id;
      sub.stripeCustomerId = customerId;
      await subRepo().save(sub);
    }

    // Resolve influencer coupon if promoCode provided (or from parent's stored referralCode)
    const codeToApply = promoCode || parent.referralCode || undefined;
    let stripeCouponId: string | null = null;
    let discountApplied: number | undefined;

    if (codeToApply) {
      try {
        const { influencerService } = await import('./influencer.service');
        const validation = await influencerService.validateCode(codeToApply);
        if (validation?.valid) {
          stripeCouponId = await influencerService.getOrCreateStripeCoupon(codeToApply);
          discountApplied = validation.discountPercent;
        }
      } catch {
        // Non-fatal — proceed without discount
      }
    }

    // If no influencer discount, check for parent-referral discount
    if (!stripeCouponId) {
      try {
        const { parentReferralService } = await import('./parentReferral.service');
        const referral = await parentReferralService.getActiveReferralForParent(parentId);
        if (referral) {
          const config = await parentReferralService.getConfig();
          if (config.isEnabled && config.referredDiscountPercent > 0) {
            stripeCouponId = await parentReferralService.getOrCreateReferralCoupon(config.referredDiscountPercent);
            discountApplied = config.referredDiscountPercent;
          }
        }
      } catch {
        // Non-fatal
      }
    }

    // Build subscription params
    const subParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.confirmation_secret'],
    };

    if (stripeCouponId) {
      subParams.discounts = [{ coupon: stripeCouponId }];
    }

    // Create the subscription in incomplete state so we can collect payment
    const subscription = await stripe.subscriptions.create(subParams);

    sub.stripeSubscriptionId = subscription.id;
    await subRepo().save(sub);

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const clientSecret = invoice.confirmation_secret?.client_secret;

    if (!clientSecret) {
      throw new Error('Could not create payment intent. Please try again.');
    }

    return { clientSecret, discountApplied };
  }

  // ─── Stripe Billing Portal ────────────────────────────────────────────────

  async createPortalSession(parentId: string): Promise<{ url: string }> {
    const sub = await this.getSubscription(parentId);
    if (!sub?.stripeCustomerId) {
      throw new Error('No billing account found. Please subscribe first.');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: 'cylux://subscription',
    });

    return { url: session.url };
  }

  // ─── Cancel Subscription ──────────────────────────────────────────────────

  async cancelSubscription(parentId: string): Promise<void> {
    const sub = await this.getSubscription(parentId);
    if (!sub?.stripeSubscriptionId) {
      throw new Error('No active subscription to cancel.');
    }

    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    sub.cancelAtPeriodEnd = true;
    await subRepo().save(sub);
  }

  // ─── Webhook Handler ──────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, sig: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('[Subscription] STRIPE_WEBHOOK_SECRET not set — skipping webhook verification');
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(`[Subscription] Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const stripeSub = event.data.object as Stripe.Subscription;
        await this.syncFromStripe(stripeSub);
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const sub = await subRepo().findOne({ where: { stripeSubscriptionId: stripeSub.id } });
        if (sub) {
          sub.status = 'cancelled';
          await subRepo().save(sub);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const paidSubId = invoice.parent?.subscription_details?.subscription;
        if (paidSubId) {
          const sub = await subRepo().findOne({ where: { stripeSubscriptionId: String(paidSubId) } });
          if (sub) {
            sub.status = 'active';
            if (invoice.period_end) {
              sub.currentPeriodEnd = new Date(invoice.period_end * 1000);
            }
            await subRepo().save(sub);

            const parent = await parentRepo().findOne({ where: { id: sub.parentId } });
            if (parent) {
              const planName = PLAN_LIMITS[sub.plan as PlanId]?.name || sub.plan;
              await emailService.sendSubscriptionActivated(parent.email, parent.name, planName);

              // Record referral conversion for influencer tracking
              if (invoice.amount_paid > 0) {
                try {
                  const { influencerService } = await import('./influencer.service');
                  await influencerService.recordConversion(sub.parentId, sub.plan, invoice.amount_paid);
                } catch {
                  // Non-fatal
                }

                // Record conversion for parent-to-parent referral
                try {
                  const { parentReferralService } = await import('./parentReferral.service');
                  await parentReferralService.processConversion(sub.parentId, sub.plan, invoice.amount_paid);
                } catch {
                  // Non-fatal
                }
              }
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const failedSubId = invoice.parent?.subscription_details?.subscription;
        if (failedSubId) {
          const sub = await subRepo().findOne({ where: { stripeSubscriptionId: String(failedSubId) } });
          if (sub) {
            sub.status = 'past_due';
            await subRepo().save(sub);

            const parent = await parentRepo().findOne({ where: { id: sub.parentId } });
            if (parent) {
              await emailService.sendPaymentFailed(parent.email, parent.name);
            }
          }
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const sub = await subRepo().findOne({ where: { stripeSubscriptionId: stripeSub.id } });
        if (sub) {
          const parent = await parentRepo().findOne({ where: { id: sub.parentId } });
          if (parent) {
            // Stripe sends this 3 days before trial ends
            await emailService.sendTrialEndingReminder(parent.email, parent.name, 3);
          }
        }
        break;
      }

      default:
        // Unhandled event type — safe to ignore
        break;
    }
  }

  // ─── Internal: Sync from Stripe subscription object ───────────────────────

  private async syncFromStripe(stripeSub: Stripe.Subscription): Promise<void> {
    const sub = await subRepo().findOne({ where: { stripeSubscriptionId: stripeSub.id } });
    if (!sub) {
      // Could be a new subscription created via portal; find by customer ID
      const byCust = await subRepo().findOne({ where: { stripeCustomerId: String(stripeSub.customer) } });
      if (!byCust) return;

      byCust.stripeSubscriptionId = stripeSub.id;
      await this.applyStripeSubFields(byCust, stripeSub);
      await subRepo().save(byCust);
      return;
    }

    await this.applyStripeSubFields(sub, stripeSub);
    await subRepo().save(sub);
  }

  private async applyStripeSubFields(sub: SubscriptionEntity, stripeSub: Stripe.Subscription) {
    // Map Stripe status to our status
    const statusMap: Record<string, string> = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'cancelled',
      incomplete: 'incomplete',
      incomplete_expired: 'incomplete',
      unpaid: 'past_due',
      paused: 'past_due',
    };
    sub.status = statusMap[stripeSub.status] ?? stripeSub.status;
    sub.cancelAtPeriodEnd = stripeSub.cancel_at_period_end;

    const periodEnd = stripeSub.items.data[0]?.current_period_end;
    if (periodEnd) {
      sub.currentPeriodEnd = new Date(periodEnd * 1000);
    }

    // Determine plan from price ID
    const priceId = stripeSub.items.data[0]?.price?.id;
    if (priceId) {
      const matchedPlan = (Object.entries(PLAN_LIMITS) as [PlanId, PlanLimits][]).find(
        ([, p]) => p.priceId === priceId,
      );
      if (matchedPlan) sub.plan = matchedPlan[0];
    }
  }
}

export const subscriptionService = new SubscriptionService();
