"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionService = exports.SubscriptionService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const database_1 = require("../database");
const Subscription_1 = require("../entities/Subscription");
const Parent_1 = require("../entities/Parent");
const PlanConfig_1 = require("../entities/PlanConfig");
const plans_1 = require("../config/plans");
const email_service_1 = require("./email.service");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-06-20',
});
const subRepo = () => database_1.AppDataSource.getRepository(Subscription_1.SubscriptionEntity);
const parentRepo = () => database_1.AppDataSource.getRepository(Parent_1.ParentEntity);
const planRepo = () => database_1.AppDataSource.getRepository(PlanConfig_1.PlanConfigEntity);
class SubscriptionService {
    // ─── Trial Creation ───────────────────────────────────────────────────────
    /** Called from auth.service.ts immediately after a new parent is saved. */
    createTrialSubscription(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    // ─── Retrieval ────────────────────────────────────────────────────────────
    getSubscription(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            let sub = yield subRepo().findOne({ where: { parentId } });
            if (!sub) {
                const parent = yield parentRepo().findOne({ where: { id: parentId } });
                if (!parent)
                    return null;
                console.warn(`[Subscription] No subscription found for parent ${parentId} — auto-creating trial.`);
                sub = yield this.createTrialSubscription(parentId);
            }
            if (sub.status === 'trialing' && sub.trialEndsAt && sub.trialEndsAt < new Date()) {
                sub.status = 'incomplete';
                yield subRepo().save(sub);
            }
            // Self-heal: if the sub is in an ambiguous state but has a Stripe subscription ID,
            // silently pull the real state from Stripe. This covers the case where both the
            // client-side sync and the webhook fail — the next page load auto-recovers.
            if (sub.status === 'incomplete' && sub.stripeSubscriptionId) {
                try {
                    yield this.syncSubscriptionForParent(parentId);
                    sub = (_a = (yield subRepo().findOne({ where: { parentId } }))) !== null && _a !== void 0 ? _a : sub;
                }
                catch (_b) {
                    // Non-fatal — return whatever is in the DB
                }
            }
            return sub;
        });
    }
    /**
     * Returns the effective plan slug for limit checks.
     * Returns null if the subscription is expired/cancelled (paywalled).
     */
    getEffectivePlan(sub) {
        if (!sub)
            return 'trial';
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
    checkLimit(parentId, key) {
        return __awaiter(this, void 0, void 0, function* () {
            const sub = yield this.getSubscription(parentId);
            const planId = this.getEffectivePlan(sub);
            if (!planId)
                return { allowed: false, limit: 0 };
            const limits = yield (0, plans_1.getPlanConfig)(planId);
            const value = limits[key];
            if (typeof value === 'boolean')
                return { allowed: value, limit: value };
            if (typeof value === 'number')
                return { allowed: value > 0, limit: value };
            return { allowed: false, limit: 0 };
        });
    }
    /**
     * Returns a Stripe Price ID denominated in `currency` with the same unit_amount
     * as the given USD priceId. Lazily creates and caches the price in plan_config_entity.
     */
    getOrCreateLocalPrice(planConfig, usdPriceId, currency) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const cur = currency.toLowerCase();
            const cached = (_a = planConfig.localPriceIds) === null || _a === void 0 ? void 0 : _a[cur];
            if (cached)
                return cached;
            const usdPrice = yield stripe.prices.retrieve(usdPriceId);
            if (!usdPrice.unit_amount)
                throw new Error('USD price has no unit_amount');
            const localPrice = yield stripe.prices.create({
                currency: cur,
                unit_amount: usdPrice.unit_amount, // same numeral, different currency
                product: usdPrice.product,
                recurring: usdPrice.recurring
                    ? { interval: usdPrice.recurring.interval, interval_count: usdPrice.recurring.interval_count }
                    : undefined,
                nickname: `${usdPrice.nickname || planConfig.planId} (${currency.toUpperCase()})`.trim(),
            });
            planConfig.localPriceIds = Object.assign(Object.assign({}, ((_b = planConfig.localPriceIds) !== null && _b !== void 0 ? _b : {})), { [cur]: localPrice.id });
            yield planRepo().save(planConfig);
            return localPrice.id;
        });
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
    createStripeSubscription(parentId, priceId, promoCode, currency) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const parent = yield parentRepo().findOne({ where: { id: parentId } });
            if (!parent)
                throw new Error('Parent not found');
            const sub = yield this.getSubscription(parentId);
            if (!sub)
                throw new Error('Parent account not found');
            // Validate priceId against active plans in DB — determines monthly vs annual
            const monthlyMatch = yield planRepo().findOne({
                where: { stripePriceId: priceId, isActive: true },
            });
            const annualMatch = !monthlyMatch
                ? yield planRepo().findOne({ where: { stripePriceIdAnnual: priceId, isActive: true } })
                : null;
            const matchedPlan = monthlyMatch || annualMatch;
            if (!matchedPlan)
                throw new Error('Invalid plan selected');
            if (matchedPlan.contactSalesOnly)
                throw new Error('This plan requires contacting sales — no self-serve checkout');
            const billingInterval = monthlyMatch ? 'monthly' : 'annual';
            // Resolve the effective Stripe price ID.
            // For strong currencies (EUR, GBP, CHF), lazily create a local-currency price
            // with the same unit_amount as the USD price (same-number billing).
            let effectivePriceId = priceId;
            const upperCurrency = currency === null || currency === void 0 ? void 0 : currency.toUpperCase();
            if (upperCurrency && SubscriptionService.SAME_NUMBER_CURRENCIES.has(upperCurrency)) {
                effectivePriceId = yield this.getOrCreateLocalPrice(matchedPlan, priceId, upperCurrency);
            }
            // Create Stripe customer if not already created
            let customerId = sub.stripeCustomerId;
            if (!customerId) {
                const customer = yield stripe.customers.create({
                    email: parent.email,
                    name: parent.name,
                    metadata: { parentId },
                });
                customerId = customer.id;
                sub.stripeCustomerId = customerId;
                yield subRepo().save(sub);
            }
            // Resolve influencer coupon
            const codeToApply = promoCode || parent.referralCode || undefined;
            let stripeCouponId = null;
            let discountApplied;
            if (codeToApply) {
                try {
                    const { influencerService } = yield Promise.resolve().then(() => __importStar(require('./influencer.service')));
                    const validation = yield influencerService.validateCode(codeToApply);
                    if (validation === null || validation === void 0 ? void 0 : validation.valid) {
                        stripeCouponId = yield influencerService.getOrCreateStripeCoupon(codeToApply);
                        discountApplied = validation.discountPercent;
                    }
                }
                catch (_b) {
                    // Non-fatal
                }
            }
            // Fall back to parent-referral discount
            if (!stripeCouponId) {
                try {
                    const { parentReferralService } = yield Promise.resolve().then(() => __importStar(require('./parentReferral.service')));
                    const referral = yield parentReferralService.getActiveReferralForParent(parentId);
                    if (referral) {
                        const config = yield parentReferralService.getConfig();
                        if (config.isEnabled && config.referredDiscountPercent > 0) {
                            stripeCouponId = yield parentReferralService.getOrCreateReferralCoupon(config.referredDiscountPercent);
                            discountApplied = config.referredDiscountPercent;
                        }
                    }
                }
                catch (_c) {
                    // Non-fatal
                }
            }
            const subParams = {
                customer: customerId,
                items: [{ price: effectivePriceId }],
                payment_behavior: 'default_incomplete',
                expand: ['latest_invoice.confirmation_secret'],
            };
            if (stripeCouponId) {
                subParams.discounts = [{ coupon: stripeCouponId }];
            }
            const subscription = yield stripe.subscriptions.create(subParams);
            sub.stripeSubscriptionId = subscription.id;
            sub.billingInterval = billingInterval;
            yield subRepo().save(sub);
            const invoice = subscription.latest_invoice;
            const clientSecret = (_a = invoice.confirmation_secret) === null || _a === void 0 ? void 0 : _a.client_secret;
            if (!clientSecret) {
                throw new Error('Could not create payment intent. Please try again.');
            }
            return { clientSecret, discountApplied };
        });
    }
    // ─── Stripe Billing Portal ────────────────────────────────────────────────
    createPortalSession(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sub = yield this.getSubscription(parentId);
            if (!(sub === null || sub === void 0 ? void 0 : sub.stripeCustomerId)) {
                throw new Error('No billing account found. Please subscribe first.');
            }
            const returnUrl = process.env.APP_URL
                ? `${process.env.APP_URL}/app/subscription`
                : 'http://localhost:3000/app/subscription';
            const session = yield stripe.billingPortal.sessions.create({
                customer: sub.stripeCustomerId,
                return_url: returnUrl,
            });
            return { url: session.url };
        });
    }
    // ─── Change Plan (upgrade or downgrade) ───────────────────────────────────
    /**
     * Updates an existing Stripe subscription to a new price with proration.
     * - Upgrade: Stripe immediately invoices the prorated difference and charges
     *   the card on file. Access upgrades instantly.
     * - Downgrade: Stripe creates a prorated credit applied to the next invoice.
     *   Features drop immediately; no refund — credit reduces the next charge.
     *
     * For the "keep current features until period end" downgrade experience, use
     * the Stripe Billing Portal instead (createPortalSession).
     */
    changePlan(parentId, priceId, currency) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const sub = yield this.getSubscription(parentId);
            if (!(sub === null || sub === void 0 ? void 0 : sub.stripeSubscriptionId)) {
                throw new Error('No active subscription to change. Please subscribe first.');
            }
            if (sub.status !== 'active' && sub.status !== 'past_due') {
                throw new Error('Can only change plan on an active subscription.');
            }
            // Validate target plan
            const monthlyMatch = yield planRepo().findOne({ where: { stripePriceId: priceId, isActive: true } });
            const annualMatch = !monthlyMatch
                ? yield planRepo().findOne({ where: { stripePriceIdAnnual: priceId, isActive: true } })
                : null;
            const targetPlan = monthlyMatch || annualMatch;
            if (!targetPlan)
                throw new Error('Invalid plan selected');
            if (targetPlan.contactSalesOnly)
                throw new Error('This plan requires contacting sales.');
            if (targetPlan.planId === sub.plan)
                throw new Error('Already on this plan.');
            const billingInterval = monthlyMatch ? 'monthly' : 'annual';
            // Resolve local-currency price if applicable
            let effectivePriceId = priceId;
            const upperCurrency = currency === null || currency === void 0 ? void 0 : currency.toUpperCase();
            if (upperCurrency && SubscriptionService.SAME_NUMBER_CURRENCIES.has(upperCurrency)) {
                effectivePriceId = yield this.getOrCreateLocalPrice(targetPlan, priceId, upperCurrency);
            }
            // Get the current subscription item ID from Stripe
            const stripeSub = yield stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
            const itemId = (_a = stripeSub.items.data[0]) === null || _a === void 0 ? void 0 : _a.id;
            if (!itemId)
                throw new Error('Could not resolve current subscription item.');
            // Update Stripe subscription with proration
            yield stripe.subscriptions.update(sub.stripeSubscriptionId, {
                items: [{ id: itemId, price: effectivePriceId }],
                proration_behavior: 'create_prorations',
            });
            // Sync DB immediately — webhook will also fire and confirm
            sub.plan = targetPlan.planId;
            sub.billingInterval = billingInterval;
            sub.cancelAtPeriodEnd = false;
            yield subRepo().save(sub);
        });
    }
    // ─── Cancel Subscription ──────────────────────────────────────────────────
    cancelSubscription(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sub = yield this.getSubscription(parentId);
            if (!(sub === null || sub === void 0 ? void 0 : sub.stripeSubscriptionId)) {
                throw new Error('No active subscription to cancel.');
            }
            yield stripe.subscriptions.update(sub.stripeSubscriptionId, {
                cancel_at_period_end: true,
            });
            sub.cancelAtPeriodEnd = true;
            yield subRepo().save(sub);
        });
    }
    // ─── Webhook Handler ──────────────────────────────────────────────────────
    handleWebhook(rawBody, sig) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
            if (!webhookSecret) {
                console.warn('[Subscription] STRIPE_WEBHOOK_SECRET not set — skipping webhook verification');
                return;
            }
            let event;
            try {
                event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
            }
            catch (err) {
                throw new Error(`Webhook signature verification failed: ${err.message}`);
            }
            console.log(`[Subscription] Stripe webhook: ${event.type}`);
            switch (event.type) {
                case 'customer.subscription.updated':
                case 'customer.subscription.created': {
                    const stripeSub = event.data.object;
                    yield this.syncFromStripe(stripeSub);
                    break;
                }
                case 'customer.subscription.deleted': {
                    const stripeSub = event.data.object;
                    const sub = yield subRepo().findOne({ where: { stripeSubscriptionId: stripeSub.id } });
                    if (sub) {
                        sub.status = 'cancelled';
                        yield subRepo().save(sub);
                    }
                    break;
                }
                case 'invoice.payment_succeeded': {
                    const invoice = event.data.object;
                    const paidSubId = (_b = (_a = invoice.parent) === null || _a === void 0 ? void 0 : _a.subscription_details) === null || _b === void 0 ? void 0 : _b.subscription;
                    if (paidSubId) {
                        const sub = yield subRepo().findOne({ where: { stripeSubscriptionId: String(paidSubId) } });
                        if (sub) {
                            sub.status = 'active';
                            if (invoice.period_end) {
                                sub.currentPeriodEnd = new Date(invoice.period_end * 1000);
                            }
                            yield subRepo().save(sub);
                            const parent = yield parentRepo().findOne({ where: { id: sub.parentId } });
                            if (parent) {
                                const planConfig = yield (0, plans_1.getPlanConfig)(sub.plan);
                                const planName = (planConfig === null || planConfig === void 0 ? void 0 : planConfig.name) || sub.plan;
                                yield email_service_1.emailService.sendSubscriptionActivated(parent.email, parent.name, planName);
                                if (invoice.amount_paid > 0) {
                                    try {
                                        const { influencerService } = yield Promise.resolve().then(() => __importStar(require('./influencer.service')));
                                        yield influencerService.recordConversion(sub.parentId, sub.plan, invoice.amount_paid);
                                    }
                                    catch ( /* Non-fatal */_e) { /* Non-fatal */ }
                                    try {
                                        const { parentReferralService } = yield Promise.resolve().then(() => __importStar(require('./parentReferral.service')));
                                        yield parentReferralService.processConversion(sub.parentId, sub.plan, invoice.amount_paid);
                                    }
                                    catch ( /* Non-fatal */_f) { /* Non-fatal */ }
                                }
                            }
                        }
                    }
                    break;
                }
                case 'invoice.payment_failed': {
                    const invoice = event.data.object;
                    const failedSubId = (_d = (_c = invoice.parent) === null || _c === void 0 ? void 0 : _c.subscription_details) === null || _d === void 0 ? void 0 : _d.subscription;
                    if (failedSubId) {
                        const sub = yield subRepo().findOne({ where: { stripeSubscriptionId: String(failedSubId) } });
                        if (sub) {
                            sub.status = 'past_due';
                            yield subRepo().save(sub);
                            const parent = yield parentRepo().findOne({ where: { id: sub.parentId } });
                            if (parent) {
                                yield email_service_1.emailService.sendPaymentFailed(parent.email, parent.name);
                            }
                        }
                    }
                    break;
                }
                case 'customer.subscription.trial_will_end': {
                    const stripeSub = event.data.object;
                    const sub = yield subRepo().findOne({ where: { stripeSubscriptionId: stripeSub.id } });
                    if (sub) {
                        const parent = yield parentRepo().findOne({ where: { id: sub.parentId } });
                        if (parent) {
                            yield email_service_1.emailService.sendTrialEndingReminder(parent.email, parent.name, 3);
                        }
                    }
                    break;
                }
                default:
                    break;
            }
        });
    }
    // ─── Manual Sync (called by client after payment confirmation) ───────────
    /**
     * Fetches the current subscription state from Stripe and syncs it to the DB.
     * Called client-side immediately after stripe.confirmPayment() succeeds so the
     * DB is updated without waiting for the webhook (essential for local dev and
     * for avoiding the webhook delivery race condition in production).
     */
    syncSubscriptionForParent(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sub = yield subRepo().findOne({ where: { parentId } });
            if (!(sub === null || sub === void 0 ? void 0 : sub.stripeSubscriptionId))
                return;
            const stripeSub = yield stripe.subscriptions.retrieve(sub.stripeSubscriptionId, {
                expand: ['items.data.price'],
            });
            yield this.syncFromStripe(stripeSub);
        });
    }
    // ─── Internal: Sync from Stripe ───────────────────────────────────────────
    syncFromStripe(stripeSub) {
        return __awaiter(this, void 0, void 0, function* () {
            const sub = yield subRepo().findOne({ where: { stripeSubscriptionId: stripeSub.id } });
            if (!sub) {
                const byCust = yield subRepo().findOne({ where: { stripeCustomerId: String(stripeSub.customer) } });
                if (!byCust)
                    return;
                byCust.stripeSubscriptionId = stripeSub.id;
                yield this.applyStripeSubFields(byCust, stripeSub);
                yield subRepo().save(byCust);
                return;
            }
            yield this.applyStripeSubFields(sub, stripeSub);
            yield subRepo().save(sub);
        });
    }
    applyStripeSubFields(sub, stripeSub) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const statusMap = {
                active: 'active',
                trialing: 'trialing',
                past_due: 'past_due',
                canceled: 'cancelled',
                incomplete: 'incomplete',
                incomplete_expired: 'incomplete',
                unpaid: 'past_due',
                paused: 'past_due',
            };
            sub.status = (_a = statusMap[stripeSub.status]) !== null && _a !== void 0 ? _a : stripeSub.status;
            sub.cancelAtPeriodEnd = stripeSub.cancel_at_period_end;
            const periodEnd = (_b = stripeSub.items.data[0]) === null || _b === void 0 ? void 0 : _b.current_period_end;
            if (periodEnd) {
                sub.currentPeriodEnd = new Date(periodEnd * 1000);
            }
            // Determine plan and billing interval from the Stripe Price ID — DB-first
            const priceId = (_d = (_c = stripeSub.items.data[0]) === null || _c === void 0 ? void 0 : _c.price) === null || _d === void 0 ? void 0 : _d.id;
            if (priceId) {
                const monthlyMatch = yield planRepo().findOne({ where: { stripePriceId: priceId } });
                const annualMatch = !monthlyMatch
                    ? yield planRepo().findOne({ where: { stripePriceIdAnnual: priceId } })
                    : null;
                const matched = monthlyMatch || annualMatch;
                if (matched) {
                    sub.plan = matched.planId;
                    sub.billingInterval = monthlyMatch ? 'monthly' : 'annual';
                }
            }
        });
    }
}
exports.SubscriptionService = SubscriptionService;
// ─── Same-number local currency pricing ──────────────────────────────────
/**
 * Currencies stronger than USD that use same-number billing
 * (e.g. $10 plan → £10, €10, Fr10 charged via Stripe).
 */
SubscriptionService.SAME_NUMBER_CURRENCIES = new Set(['EUR', 'GBP', 'CHF']);
exports.subscriptionService = new SubscriptionService();
//# sourceMappingURL=subscription.service.js.map