import Stripe from 'stripe';
import { AppDataSource } from '../database';
import { SubscriptionEntity } from '../entities/Subscription';
import { ParentEntity } from '../entities/Parent';
import { PlanConfigEntity } from '../entities/PlanConfig';
import { getPlanConfig, PlanLimits } from '../config/plans';
import { emailService } from './email.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20' as any,
});

const subRepo = () => AppDataSource.getRepository(SubscriptionEntity);
const parentRepo = () => AppDataSource.getRepository(ParentEntity);
const planRepo = () => AppDataSource.getRepository(PlanConfigEntity);

export class SubscriptionService {
  // ─── Trial Creation ───────────────────────────────────────────────────────

  /** Called from auth.service.ts immediately after a new parent is saved. */
  async createTrialSubscription(parentId: string): Promise<SubscriptionEntity> {
    const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const sub = subRepo().create({
      parentId,
      plan: 'trial',
      status: 'trialing',
      billingInterval: 'monthly',
      trialEndsAt,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
    return subRepo().save(sub);
  }

  // ─── Retrieval ────────────────────────────────────────────────────────────

  async getSubscription(parentId: string): Promise<SubscriptionEntity | null> {
    let sub = await subRepo().findOne({ where: { parentId } });

    if (!sub) {
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
   * Returns the effective plan slug for limit checks.
   * Returns null if the subscription is expired/cancelled (paywalled).
   */
  getEffectivePlan(sub: SubscriptionEntity | null): string | null {
    if (!sub) return 'trial';
    if (sub.status === 'trialing' && sub.trialEndsAt && sub.trialEndsAt > new Date()) {
      return 'trial';
    }
    if (sub.status === 'active' || sub.status === 'past_due') {
      return sub.plan;
    }
    return null;
  }

  // ─── Limit Checks ─────────────────────────────────────────────────────────

  /** Returns { allowed, limit } for any plan feature key. DB-first via getPlanConfig. */
  async checkLimit(
    parentId: string,
    key: keyof PlanLimits,
  ): Promise<{ allowed: boolean; limit: number | boolean }> {
    const sub = await this.getSubscription(parentId);
    const planId = this.getEffectivePlan(sub);

    if (!planId) return { allowed: false, limit: 0 };

    const limits = await getPlanConfig(planId);
    const value = limits[key] as number | boolean | string | undefined;

    if (typeof value === 'boolean') return { allowed: value, limit: value };
    if (typeof value === 'number') return { allowed: value > 0, limit: value };
    return { allowed: false, limit: 0 };
  }

  // ─── Same-number local currency pricing ──────────────────────────────────

  /**
   * Currencies stronger than USD that use same-number billing
   * (e.g. $10 plan → £10, €10, Fr10 charged via Stripe).
   */
  static readonly SAME_NUMBER_CURRENCIES = new Set(['EUR', 'GBP', 'CHF']);

  /**
   * Returns a Stripe Price ID denominated in `currency` with the same unit_amount
   * as the given USD priceId. Lazily creates and caches the price in plan_config_entity.
   */
  private async getOrCreateLocalPrice(
    planConfig: PlanConfigEntity,
    usdPriceId: string,
    currency: string,
  ): Promise<string> {
    const cur = currency.toLowerCase();

    const cached = planConfig.localPriceIds?.[cur];
    if (cached) return cached;

    const usdPrice = await stripe.prices.retrieve(usdPriceId);
    if (!usdPrice.unit_amount) throw new Error('USD price has no unit_amount');

    const localPrice = await stripe.prices.create({
      currency: cur,
      unit_amount: usdPrice.unit_amount, // same numeral, different currency
      product: usdPrice.product as string,
      recurring: usdPrice.recurring
        ? { interval: usdPrice.recurring.interval, interval_count: usdPrice.recurring.interval_count }
        : undefined,
      nickname: `${usdPrice.nickname || planConfig.planId} (${currency.toUpperCase()})`.trim(),
    });

    planConfig.localPriceIds = { ...(planConfig.localPriceIds ?? {}), [cur]: localPrice.id };
    await planRepo().save(planConfig);

    return localPrice.id;
  }

  // ─── Stripe Subscription Creation ─────────────────────────────────────────

  /**
   * Creates a Stripe Customer (if needed) + Subscription in `default_incomplete` mode.
   * Returns the clientSecret for Stripe Payment Sheet.
   *
   * Pass `currency` (ISO 4217) for same-number local currency billing.
   * Strong currencies (EUR, GBP, CHF) are charged the same numeral as the USD price.
   * All other currencies use the USD priceId directly.
   */
  async createStripeSubscription(
    parentId: string,
    priceId: string,
    promoCode?: string,
    currency?: string,
  ): Promise<{ clientSecret: string; discountApplied?: number }> {
    const parent = await parentRepo().findOne({ where: { id: parentId } });
    if (!parent) throw new Error('Parent not found');

    const sub = await this.getSubscription(parentId);
    if (!sub) throw new Error('Parent account not found');

    // Validate priceId against active plans in DB — determines monthly vs annual
    const monthlyMatch = await planRepo().findOne({
      where: { stripePriceId: priceId, isActive: true },
    });
    const annualMatch = !monthlyMatch
      ? await planRepo().findOne({ where: { stripePriceIdAnnual: priceId, isActive: true } })
      : null;
    const matchedPlan = monthlyMatch || annualMatch;

    if (!matchedPlan) throw new Error('Invalid plan selected');
    if (matchedPlan.contactSalesOnly) throw new Error('This plan requires contacting sales — no self-serve checkout');

    const billingInterval: 'monthly' | 'annual' = monthlyMatch ? 'monthly' : 'annual';

    // Resolve the effective Stripe price ID.
    // For strong currencies (EUR, GBP, CHF), lazily create a local-currency price
    // with the same unit_amount as the USD price (same-number billing).
    let effectivePriceId = priceId;
    const upperCurrency = currency?.toUpperCase();
    if (upperCurrency && SubscriptionService.SAME_NUMBER_CURRENCIES.has(upperCurrency)) {
      effectivePriceId = await this.getOrCreateLocalPrice(matchedPlan, priceId, upperCurrency);
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

    // Resolve influencer coupon
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
        // Non-fatal
      }
    }

    // Fall back to parent-referral discount
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

    const subParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: effectivePriceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.confirmation_secret'],
    };

    if (stripeCouponId) {
      subParams.discounts = [{ coupon: stripeCouponId }];
    }

    const subscription = await stripe.subscriptions.create(subParams);

    sub.stripeSubscriptionId = subscription.id;
    sub.billingInterval = billingInterval;
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
              const planConfig = await getPlanConfig(sub.plan);
              const planName = planConfig?.name || sub.plan;
              await emailService.sendSubscriptionActivated(parent.email, parent.name, planName);

              if (invoice.amount_paid > 0) {
                try {
                  const { influencerService } = await import('./influencer.service');
                  await influencerService.recordConversion(sub.parentId, sub.plan, invoice.amount_paid);
                } catch { /* Non-fatal */ }

                try {
                  const { parentReferralService } = await import('./parentReferral.service');
                  await parentReferralService.processConversion(sub.parentId, sub.plan, invoice.amount_paid);
                } catch { /* Non-fatal */ }
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
            await emailService.sendTrialEndingReminder(parent.email, parent.name, 3);
          }
        }
        break;
      }

      default:
        break;
    }
  }

  // ─── Internal: Sync from Stripe ───────────────────────────────────────────

  private async syncFromStripe(stripeSub: Stripe.Subscription): Promise<void> {
    const sub = await subRepo().findOne({ where: { stripeSubscriptionId: stripeSub.id } });
    if (!sub) {
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

    // Determine plan and billing interval from the Stripe Price ID — DB-first
    const priceId = stripeSub.items.data[0]?.price?.id;
    if (priceId) {
      const monthlyMatch = await planRepo().findOne({ where: { stripePriceId: priceId } });
      const annualMatch = !monthlyMatch
        ? await planRepo().findOne({ where: { stripePriceIdAnnual: priceId } })
        : null;
      const matched = monthlyMatch || annualMatch;

      if (matched) {
        sub.plan = matched.planId;
        sub.billingInterval = monthlyMatch ? 'monthly' : 'annual';
      }
    }
  }
}

export const subscriptionService = new SubscriptionService();
