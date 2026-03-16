"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionController = exports.SubscriptionController = void 0;
const subscription_service_1 = require("../services/subscription.service");
const plans_1 = require("../config/plans");
const response_1 = require("../utils/response");
class SubscriptionController {
    constructor() {
        /** GET /api/subscription/plans — public (DB-driven with hardcoded fallback) */
        this.getPlans = (_req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const plans = yield (0, plans_1.getPlansForClientFromDb)();
                return response_1.ApiResponse.success(res, plans, 'Available plans');
            }
            catch (_a) {
                return response_1.ApiResponse.success(res, (0, plans_1.getPlansForClient)(), 'Available plans');
            }
        });
        /** GET /api/subscription — authenticated parent */
        this.getSubscription = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const sub = yield subscription_service_1.subscriptionService.getSubscription(req.user.id);
                if (!sub) {
                    return response_1.ApiResponse.error(res, 'Subscription not found', 404);
                }
                const effectivePlan = subscription_service_1.subscriptionService.getEffectivePlan(sub);
                const features = effectivePlan ? yield (0, plans_1.getPlanConfig)(effectivePlan) : null;
                return response_1.ApiResponse.success(res, {
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
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        /** POST /api/subscription/checkout — authenticated parent */
        this.createCheckout = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { priceId, promoCode, currency } = req.body;
                if (!priceId || typeof priceId !== 'string') {
                    return response_1.ApiResponse.error(res, 'priceId is required', 400);
                }
                // Full validation (plan existence, isActive, contactSalesOnly) is done in the service
                const result = yield subscription_service_1.subscriptionService.createStripeSubscription(req.user.id, priceId, promoCode ? String(promoCode) : undefined, currency ? String(currency) : undefined);
                return response_1.ApiResponse.success(res, result, 'Payment intent created');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message, 400);
            }
        });
        /**
         * POST /api/subscription/sync — authenticated parent.
         * Fetches the latest subscription state from Stripe and syncs the DB.
         * Call this client-side right after stripe.confirmPayment() succeeds to avoid
         * waiting for webhook delivery (especially important in local dev).
         */
        this.syncSubscription = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield subscription_service_1.subscriptionService.syncSubscriptionForParent(req.user.id);
                return this.getSubscription(req, res);
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        /**
         * POST /api/subscription/change-plan — authenticated parent.
         * Switches an active subscription to a different price with Stripe proration.
         * No payment form needed — Stripe charges/credits the card already on file.
         */
        this.changePlan = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { priceId, currency } = req.body;
                if (!priceId || typeof priceId !== 'string') {
                    return response_1.ApiResponse.error(res, 'priceId is required', 400);
                }
                yield subscription_service_1.subscriptionService.changePlan(req.user.id, priceId, currency ? String(currency) : undefined);
                return this.getSubscription(req, res);
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message, 400);
            }
        });
        /** POST /api/subscription/portal — authenticated parent */
        this.createPortal = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield subscription_service_1.subscriptionService.createPortalSession(req.user.id);
                return response_1.ApiResponse.success(res, result, 'Billing portal session created');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        /** POST /api/subscription/cancel — authenticated parent */
        this.cancelSubscription = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield subscription_service_1.subscriptionService.cancelSubscription(req.user.id);
                return response_1.ApiResponse.success(res, null, 'Subscription will cancel at period end');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        /**
         * POST /api/subscription/webhook — raw body, no auth.
         * Must be registered BEFORE express.json() in index.ts.
         */
        this.webhook = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const sig = req.headers['stripe-signature'];
            if (!sig) {
                return res.status(400).json({ error: 'Missing stripe-signature header' });
            }
            try {
                yield subscription_service_1.subscriptionService.handleWebhook(req.body, sig);
                return res.status(200).json({ received: true });
            }
            catch (err) {
                console.error('[Webhook] Error:', err.message);
                return res.status(400).json({ error: err.message });
            }
        });
    }
}
exports.SubscriptionController = SubscriptionController;
exports.subscriptionController = new SubscriptionController();
//# sourceMappingURL=subscription.controller.js.map