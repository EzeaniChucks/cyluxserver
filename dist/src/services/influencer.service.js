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
exports.influencerService = exports.InfluencerService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const stripe_1 = __importDefault(require("stripe"));
const database_1 = require("../database");
const Influencer_1 = require("../entities/Influencer");
const Referral_1 = require("../entities/Referral");
const Parent_1 = require("../entities/Parent");
const Subscription_1 = require("../entities/Subscription");
const INFLUENCER_JWT_SECRET = process.env.INFLUENCER_JWT_SECRET;
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-06-20',
});
const influencerRepo = () => database_1.AppDataSource.getRepository(Influencer_1.InfluencerEntity);
const referralRepo = () => database_1.AppDataSource.getRepository(Referral_1.ReferralEntity);
const parentRepo = () => database_1.AppDataSource.getRepository(Parent_1.ParentEntity);
const subRepo = () => database_1.AppDataSource.getRepository(Subscription_1.SubscriptionEntity);
class InfluencerService {
    // ─── Auth ─────────────────────────────────────────────────────────────────
    login(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!INFLUENCER_JWT_SECRET)
                throw new Error('INFLUENCER_JWT_SECRET not configured');
            const influencer = yield influencerRepo().findOne({ where: { email: email.toLowerCase().trim() } });
            if (!influencer || !influencer.isActive)
                throw new Error('Invalid credentials');
            const valid = yield bcryptjs_1.default.compare(password, influencer.passwordHash);
            if (!valid)
                throw new Error('Invalid credentials');
            const token = jsonwebtoken_1.default.sign({ id: influencer.id }, INFLUENCER_JWT_SECRET, { expiresIn: '7d' });
            return {
                token,
                influencer: {
                    id: influencer.id,
                    email: influencer.email,
                    name: influencer.name,
                    code: influencer.code,
                    discountPercent: influencer.discountPercent,
                },
            };
        });
    }
    // ─── Code Validation ──────────────────────────────────────────────────────
    validateCode(code) {
        return __awaiter(this, void 0, void 0, function* () {
            const influencer = yield influencerRepo().findOne({ where: { code: code.toUpperCase(), isActive: true } });
            if (!influencer)
                return null;
            return {
                valid: true,
                discountPercent: influencer.discountPercent,
                influencerName: influencer.name,
                influencerId: influencer.id,
            };
        });
    }
    // ─── Stripe Coupon ────────────────────────────────────────────────────────
    /**
     * Returns the Stripe coupon ID for a given influencer code.
     * Lazily creates the coupon in Stripe on first use and caches it.
     */
    getOrCreateStripeCoupon(code) {
        return __awaiter(this, void 0, void 0, function* () {
            const influencer = yield influencerRepo().findOne({ where: { code: code.toUpperCase(), isActive: true } });
            if (!influencer)
                return null;
            if (influencer.stripeCouponId)
                return influencer.stripeCouponId;
            // Create a once-use coupon in Stripe
            const coupon = yield stripe.coupons.create({
                percent_off: influencer.discountPercent,
                duration: 'once',
                name: `${influencer.discountPercent}% off — ${influencer.code}`,
                metadata: { influencerCode: influencer.code, influencerId: influencer.id },
            });
            influencer.stripeCouponId = coupon.id;
            yield influencerRepo().save(influencer);
            return coupon.id;
        });
    }
    // ─── Referral Tracking ────────────────────────────────────────────────────
    recordRegistration(code, parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const influencer = yield influencerRepo().findOne({ where: { code: code.toUpperCase(), isActive: true } });
            if (!influencer)
                return;
            // Avoid duplicate referral records
            const existing = yield referralRepo().findOne({ where: { influencerId: influencer.id, referredParentId: parentId } });
            if (existing)
                return;
            yield referralRepo().save(referralRepo().create({
                influencerId: influencer.id,
                referredParentId: parentId,
                status: 'registered',
                discountPercent: influencer.discountPercent,
            }));
            influencer.totalReferrals += 1;
            yield influencerRepo().save(influencer);
        });
    }
    recordConversion(parentId, plan, amountCents) {
        return __awaiter(this, void 0, void 0, function* () {
            const referral = yield referralRepo().findOne({
                where: { referredParentId: parentId, status: 'registered' },
                relations: ['influencer'],
            });
            if (!referral)
                return;
            const influencer = referral.influencer;
            let rewardAmount = 0;
            if (influencer.rewardType === 'percentage' && influencer.rewardValue) {
                rewardAmount = (amountCents / 100) * (influencer.rewardValue / 100);
            }
            else if (influencer.rewardType === 'fixed' && influencer.rewardValue) {
                rewardAmount = influencer.rewardValue;
            }
            else if (influencer.rewardType === 'credit' && influencer.rewardValue) {
                rewardAmount = influencer.rewardValue;
            }
            referral.status = 'subscribed';
            referral.plan = plan;
            referral.firstPaymentAmountCents = amountCents;
            referral.rewardAmount = parseFloat(rewardAmount.toFixed(2));
            referral.rewardType = influencer.rewardType;
            yield referralRepo().save(referral);
            influencer.totalConversions += 1;
            influencer.totalEarningsUsd = parseFloat((influencer.totalEarningsUsd + rewardAmount).toFixed(2));
            yield influencerRepo().save(influencer);
            // Credit influencer's wallet — held for fraud buffer, then withdrawable
            if (rewardAmount > 0) {
                try {
                    const { walletService } = yield Promise.resolve().then(() => __importStar(require('./wallet.service')));
                    yield walletService.credit(influencer.id, 'influencer', rewardAmount, `Commission — ${plan} subscription (${influencer.rewardType})`, referral.id);
                }
                catch (_a) { }
            }
        });
    }
    // ─── CRUD (by admin) ──────────────────────────────────────────────────────
    createInfluencer(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const existingEmail = yield influencerRepo().findOne({ where: { email: data.email.toLowerCase() } });
            if (existingEmail)
                throw new Error('Email already in use');
            const existingCode = yield influencerRepo().findOne({ where: { code: data.code.toUpperCase() } });
            if (existingCode)
                throw new Error('Referral code already taken');
            const passwordHash = yield bcryptjs_1.default.hash(data.password, 12);
            const influencer = influencerRepo().create({
                name: data.name,
                email: data.email.toLowerCase(),
                passwordHash,
                code: data.code.toUpperCase(),
                discountPercent: (_a = data.discountPercent) !== null && _a !== void 0 ? _a : 20,
                rewardType: (_b = data.rewardType) !== null && _b !== void 0 ? _b : null,
                rewardValue: (_c = data.rewardValue) !== null && _c !== void 0 ? _c : null,
            });
            return influencerRepo().save(influencer);
        });
    }
    getInfluencers() {
        return __awaiter(this, void 0, void 0, function* () {
            return influencerRepo().find({ order: { createdAt: 'DESC' } });
        });
    }
    getInfluencerById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return influencerRepo().findOne({ where: { id }, relations: ['referrals'] });
        });
    }
    updateInfluencer(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const influencer = yield influencerRepo().findOne({ where: { id } });
            if (!influencer)
                throw new Error('Influencer not found');
            Object.assign(influencer, data);
            // If discountPercent changed, invalidate cached coupon so it'll be recreated
            if (data.discountPercent !== undefined && data.discountPercent !== influencer.discountPercent) {
                influencer.stripeCouponId = null;
            }
            return influencerRepo().save(influencer);
        });
    }
    deactivateInfluencer(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const influencer = yield influencerRepo().findOne({ where: { id } });
            if (!influencer)
                throw new Error('Influencer not found');
            influencer.isActive = false;
            return influencerRepo().save(influencer);
        });
    }
    getReferrals(influencerId) {
        return __awaiter(this, void 0, void 0, function* () {
            return referralRepo().find({
                where: { influencerId },
                order: { createdAt: 'DESC' },
                relations: ['referredParent'],
            });
        });
    }
    markRewardPaid(referralId) {
        return __awaiter(this, void 0, void 0, function* () {
            const referral = yield referralRepo().findOne({ where: { id: referralId } });
            if (!referral)
                throw new Error('Referral not found');
            referral.status = 'reward_paid';
            referral.rewardPaidAt = new Date();
            return referralRepo().save(referral);
        });
    }
    // ─── Dashboard (for influencer self-serve) ────────────────────────────────
    getDashboard(influencerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const influencer = yield influencerRepo().findOne({ where: { id: influencerId } });
            if (!influencer)
                throw new Error('Influencer not found');
            return {
                code: influencer.code,
                discountPercent: influencer.discountPercent,
                totalReferrals: influencer.totalReferrals,
                totalConversions: influencer.totalConversions,
                totalEarningsUsd: influencer.totalEarningsUsd,
                rewardType: influencer.rewardType,
                rewardValue: influencer.rewardValue,
            };
        });
    }
    updateProfile(influencerId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const influencer = yield influencerRepo().findOne({ where: { id: influencerId } });
            if (!influencer)
                throw new Error('Influencer not found');
            if (data.name)
                influencer.name = data.name;
            if (data.password) {
                if (data.password.length < 8)
                    throw new Error('Password must be at least 8 characters');
                influencer.passwordHash = yield bcryptjs_1.default.hash(data.password, 12);
            }
            return influencerRepo().save(influencer);
        });
    }
}
exports.InfluencerService = InfluencerService;
exports.influencerService = new InfluencerService();
//# sourceMappingURL=influencer.service.js.map