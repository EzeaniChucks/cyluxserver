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
exports.parentReferralService = exports.ParentReferralService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const stripe_1 = __importDefault(require("stripe"));
const database_1 = require("../database");
const ParentReferral_1 = require("../entities/ParentReferral");
const ParentReferralConfig_1 = require("../entities/ParentReferralConfig");
const Parent_1 = require("../entities/Parent");
const Subscription_1 = require("../entities/Subscription");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-06-20',
});
const referralRepo = () => database_1.AppDataSource.getRepository(ParentReferral_1.ParentReferralEntity);
const configRepo = () => database_1.AppDataSource.getRepository(ParentReferralConfig_1.ParentReferralConfigEntity);
const parentRepo = () => database_1.AppDataSource.getRepository(Parent_1.ParentEntity);
const subRepo = () => database_1.AppDataSource.getRepository(Subscription_1.SubscriptionEntity);
class ParentReferralService {
    // ─── Config (singleton row) ───────────────────────────────────────────────
    getConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            let config = yield configRepo().findOne({ where: {} });
            if (!config) {
                config = yield configRepo().save(configRepo().create({}));
            }
            return config;
        });
    }
    updateConfig(data, adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield this.getConfig();
            Object.assign(config, data, { updatedByAdminId: adminId });
            return configRepo().save(config);
        });
    }
    // ─── Code Management ──────────────────────────────────────────────────────
    /** Returns (or lazily creates) the parent's personal referral code. */
    getOrCreateCode(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const parent = yield parentRepo().findOne({ where: { id: parentId } });
            if (!parent)
                throw new Error('Parent not found');
            if (parent.ownReferralCode)
                return parent.ownReferralCode;
            // Generate a short unique code: first 4 letters of name + 4 random hex chars
            const prefix = (parent.name || 'USER')
                .toUpperCase()
                .replace(/[^A-Z]/g, '')
                .slice(0, 4)
                .padEnd(4, 'X');
            const suffix = crypto_1.default.randomBytes(2).toString('hex').toUpperCase();
            const code = `${prefix}${suffix}`;
            parent.ownReferralCode = code;
            yield parentRepo().save(parent);
            return code;
        });
    }
    /**
     * Validates a parent referral code.
     * Returns referrer info if valid and the program is enabled.
     */
    validateCode(code) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield this.getConfig();
            if (!config.isEnabled)
                return { valid: false };
            const parent = yield parentRepo().findOne({ where: { ownReferralCode: code.toUpperCase() } });
            if (!parent)
                return null;
            return {
                valid: true,
                referrerId: parent.id,
                discountPercent: config.referredDiscountPercent > 0 ? config.referredDiscountPercent : 0,
            };
        });
    }
    // ─── Referral Tracking ────────────────────────────────────────────────────
    recordRegistration(referrerId, newParentId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Prevent self-referral
            if (referrerId === newParentId)
                return;
            // Prevent duplicate
            const existing = yield referralRepo().findOne({ where: { referrerId, referredId: newParentId } });
            if (existing)
                return;
            yield referralRepo().save(referralRepo().create({
                referrerId,
                referredId: newParentId,
                status: 'registered',
            }));
        });
    }
    /**
     * Called when a referred parent's invoice.payment_succeeded fires.
     * Grants the configured reward to the referrer.
     */
    processConversion(newParentId, plan, amountCents) {
        return __awaiter(this, void 0, void 0, function* () {
            const referral = yield referralRepo().findOne({
                where: { referredId: newParentId, status: 'registered' },
            });
            if (!referral)
                return;
            const config = yield this.getConfig();
            if (!config.isEnabled)
                return;
            referral.plan = plan;
            referral.firstPaymentAmountCents = amountCents;
            referral.status = 'subscribed';
            referral.rewardType = config.rewardType;
            referral.rewardValue = config.rewardType !== 'none' ? config.rewardValue : null;
            yield referralRepo().save(referral);
            // Grant reward immediately
            if (config.rewardType !== 'none' && config.rewardValue > 0) {
                yield this.grantReward(referral.referrerId, config.rewardType, config.rewardValue, referral.id);
            }
        });
    }
    grantReward(referrerId, rewardType, rewardValue, referralId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const sub = yield subRepo().findOne({ where: { parentId: referrerId } });
                if (!sub)
                    return;
                if (rewardType === 'trial_extension_days') {
                    const base = sub.status === 'trialing' && sub.trialEndsAt && sub.trialEndsAt > new Date()
                        ? sub.trialEndsAt
                        : sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()
                            ? sub.currentPeriodEnd
                            : new Date();
                    const extended = new Date(base.getTime() + rewardValue * 24 * 60 * 60 * 1000);
                    if (sub.status === 'trialing') {
                        sub.trialEndsAt = extended;
                    }
                    else if (sub.status === 'active' || sub.status === 'past_due') {
                        sub.currentPeriodEnd = extended;
                    }
                    yield subRepo().save(sub);
                }
                if (rewardType === 'account_credit_usd') {
                    // Credit the referrer's wallet — held for fraud buffer, then withdrawable
                    try {
                        const { walletService } = yield Promise.resolve().then(() => __importStar(require('./wallet.service')));
                        yield walletService.credit(referrerId, 'parent', rewardValue, `Referral reward — friend subscribed`, referralId);
                    }
                    catch (_a) { }
                }
                // Mark reward granted
                yield referralRepo().update(referralId, {
                    status: 'reward_granted',
                    rewardGrantedAt: new Date(),
                });
            }
            catch (err) {
                console.error('[ParentReferral] Failed to grant reward:', err.message);
            }
        });
    }
    /** Returns the active (registered, not yet converted) referral for a given referred parent. */
    getActiveReferralForParent(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            return referralRepo().findOne({ where: { referredId: parentId, status: 'registered' } });
        });
    }
    // ─── Stats ────────────────────────────────────────────────────────────────
    getStats(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const code = yield this.getOrCreateCode(parentId);
            const config = yield this.getConfig();
            const referrals = yield referralRepo().find({
                where: { referrerId: parentId },
                order: { createdAt: 'DESC' },
                relations: ['referred'],
                take: 50,
            });
            const totalReferrals = referrals.length;
            const conversions = referrals.filter(r => r.status !== 'registered').length;
            const rewardsGranted = referrals.filter(r => r.status === 'reward_granted').length;
            const history = referrals.map(r => {
                var _a;
                return ({
                    id: r.id,
                    status: r.status,
                    plan: r.plan,
                    rewardValue: r.rewardValue,
                    rewardType: r.rewardType,
                    rewardGrantedAt: r.rewardGrantedAt,
                    createdAt: r.createdAt,
                    referredEmail: ((_a = r.referred) === null || _a === void 0 ? void 0 : _a.email)
                        ? r.referred.email.replace(/(.{2}).*(@.*)/, '$1***$2')
                        : '—',
                });
            });
            return {
                code,
                isEnabled: config.isEnabled,
                rewardType: config.rewardType,
                rewardValue: config.rewardValue,
                referredDiscountPercent: config.referredDiscountPercent,
                totalReferrals,
                conversions,
                rewardsGranted,
                history,
            };
        });
    }
    // ─── Stripe coupon for referred discount ─────────────────────────────────
    /**
     * Creates/returns a Stripe coupon for the parent referral program's new-user discount.
     * Shared coupon (not per-influencer) since it's program-wide.
     */
    getOrCreateReferralCoupon(discountPercent) {
        return __awaiter(this, void 0, void 0, function* () {
            const couponId = `CYLUX_PARENT_REF_${Math.round(discountPercent)}`;
            try {
                yield stripe.coupons.retrieve(couponId);
                return couponId;
            }
            catch (_a) {
                // Doesn't exist — create it
                yield stripe.coupons.create({
                    id: couponId,
                    percent_off: discountPercent,
                    duration: 'once',
                    name: `${discountPercent}% off — Friend referral`,
                });
                return couponId;
            }
        });
    }
}
exports.ParentReferralService = ParentReferralService;
exports.parentReferralService = new ParentReferralService();
//# sourceMappingURL=parentReferral.service.js.map