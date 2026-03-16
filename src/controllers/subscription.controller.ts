import { Request, Response } from 'express';
import { subscriptionService } from '../services/subscription.service';
import { getPlanConfig, getPlansForClient, getPlansForClientFromDb } from '../config/plans';
import { ApiResponse } from '../utils/response';

export class SubscriptionController {
  /** GET /api/subscription/plans — public (DB-driven with hardcoded fallback) */
  getPlans = async (_req: Request, res: Response) => {
    try {
      const plans = await getPlansForClientFromDb();
      return ApiResponse.success(res, plans, 'Available plans');
    } catch {
      return ApiResponse.success(res, getPlansForClient(), 'Available plans');
    }
  };

  /** GET /api/subscription — authenticated parent */
  getSubscription = async (req: any, res: any) => {
    try {
      const sub = await subscriptionService.getSubscription(req.user.id);
      if (!sub) {
        return ApiResponse.error(res, 'Subscription not found', 404);
      }
      const effectivePlan = subscriptionService.getEffectivePlan(sub);
      const features = effectivePlan ? await getPlanConfig(effectivePlan) : null;
      return ApiResponse.success(res, {
        id: sub.id,
        plan: sub.plan,
        status: sub.status,
        billingInterval: sub.billingInterval,
        effectivePlan,
        trialEndsAt: sub.trialEndsAt,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        hasStripeSubscription: !!sub.stripeSubscriptionId,
        features,
      }, 'Subscription details');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  /** POST /api/subscription/checkout — authenticated parent */
  createCheckout = async (req: any, res: any) => {
    try {
      const { priceId, promoCode, currency } = req.body;
      if (!priceId || typeof priceId !== 'string') {
        return ApiResponse.error(res, 'priceId is required', 400);
      }
      // Full validation (plan existence, isActive, contactSalesOnly) is done in the service
      const result = await subscriptionService.createStripeSubscription(
        req.user.id,
        priceId,
        promoCode ? String(promoCode) : undefined,
        currency ? String(currency) : undefined,
      );
      return ApiResponse.success(res, result, 'Payment intent created');
    } catch (err: any) {
      return ApiResponse.error(res, err.message, 400);
    }
  };

  /**
   * POST /api/subscription/sync — authenticated parent.
   * Fetches the latest subscription state from Stripe and syncs the DB.
   * Call this client-side right after stripe.confirmPayment() succeeds to avoid
   * waiting for webhook delivery (especially important in local dev).
   */
  syncSubscription = async (req: any, res: any) => {
    try {
      await subscriptionService.syncSubscriptionForParent(req.user.id);
      return this.getSubscription(req, res);
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  /**
   * POST /api/subscription/change-plan — authenticated parent.
   * Switches an active subscription to a different price with Stripe proration.
   * No payment form needed — Stripe charges/credits the card already on file.
   */
  changePlan = async (req: any, res: any) => {
    try {
      const { priceId, currency } = req.body;
      if (!priceId || typeof priceId !== 'string') {
        return ApiResponse.error(res, 'priceId is required', 400);
      }
      await subscriptionService.changePlan(
        req.user.id,
        priceId,
        currency ? String(currency) : undefined,
      );
      return this.getSubscription(req, res);
    } catch (err: any) {
      return ApiResponse.error(res, err.message, 400);
    }
  };

  /** POST /api/subscription/portal — authenticated parent */
  createPortal = async (req: any, res: any) => {
    try {
      const result = await subscriptionService.createPortalSession(req.user.id);
      return ApiResponse.success(res, result, 'Billing portal session created');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  /** POST /api/subscription/cancel — authenticated parent */
  cancelSubscription = async (req: any, res: any) => {
    try {
      await subscriptionService.cancelSubscription(req.user.id);
      return ApiResponse.success(res, null, 'Subscription will cancel at period end');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  /**
   * POST /api/subscription/webhook — raw body, no auth.
   * Must be registered BEFORE express.json() in index.ts.
   */
  webhook = async (req: any, res: any) => {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    try {
      await subscriptionService.handleWebhook(req.body as Buffer, sig);
      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('[Webhook] Error:', err.message);
      return res.status(400).json({ error: err.message });
    }
  };
}

export const subscriptionController = new SubscriptionController();
