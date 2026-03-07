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
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("../database");
const Parent_1 = require("../entities/Parent");
const email_service_1 = require("./email.service");
const subscription_service_1 = require("./subscription.service");
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error("FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables");
}
class AuthService {
    constructor() {
        this.parentRepo = database_1.AppDataSource.getRepository(Parent_1.ParentEntity);
    }
    register(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            if (!data.email || !data.name || !data.password) {
                throw new Error("All registration fields are required");
            }
            if (data.password.length < 8) {
                throw new Error("Password must be at least 8 characters");
            }
            const existing = yield this.parentRepo.findOne({
                where: { email: data.email.toLowerCase().trim() },
            });
            if (existing)
                throw new Error("Email already in use");
            // Validate referral code if provided (don't block registration if invalid)
            let validatedReferralCode = null;
            let parentReferrerId = null;
            if (data.referralCode) {
                try {
                    const { influencerService } = yield Promise.resolve().then(() => __importStar(require('./influencer.service')));
                    const result = yield influencerService.validateCode(data.referralCode);
                    if (result === null || result === void 0 ? void 0 : result.valid)
                        validatedReferralCode = data.referralCode.toUpperCase();
                }
                catch (_f) {
                    // Non-fatal — registration proceeds without referral
                }
                // If not an influencer code, try as a parent referral code
                if (!validatedReferralCode) {
                    try {
                        const { parentReferralService } = yield Promise.resolve().then(() => __importStar(require('./parentReferral.service')));
                        const result = yield parentReferralService.validateCode(data.referralCode);
                        if ((result === null || result === void 0 ? void 0 : result.valid) && result.referrerId) {
                            parentReferrerId = result.referrerId;
                        }
                    }
                    catch (_g) {
                        // Non-fatal
                    }
                }
            }
            const passwordHash = yield bcryptjs_1.default.hash(data.password, 12);
            const parent = this.parentRepo.create({
                email: data.email.toLowerCase().trim(),
                name: data.name.trim(),
                passwordHash,
                referralCode: validatedReferralCode,
                country: (_a = data.country) !== null && _a !== void 0 ? _a : null,
                currency: (_b = data.currency) !== null && _b !== void 0 ? _b : 'usd',
                locale: (_c = data.locale) !== null && _c !== void 0 ? _c : null,
                vpnFlagged: (_d = data.vpnFlagged) !== null && _d !== void 0 ? _d : false,
                detectedVia: (_e = data.detectedVia) !== null && _e !== void 0 ? _e : null,
            });
            yield this.parentRepo.save(parent);
            // Create 3-day Premium trial subscription (no credit card required)
            yield subscription_service_1.subscriptionService.createTrialSubscription(parent.id);
            // Record referral registration
            if (validatedReferralCode) {
                try {
                    const { influencerService } = yield Promise.resolve().then(() => __importStar(require('./influencer.service')));
                    yield influencerService.recordRegistration(validatedReferralCode, parent.id);
                }
                catch (_h) {
                    // Non-fatal
                }
            }
            // Record parent-to-parent referral registration
            if (parentReferrerId) {
                try {
                    const { parentReferralService } = yield Promise.resolve().then(() => __importStar(require('./parentReferral.service')));
                    yield parentReferralService.recordRegistration(parentReferrerId, parent.id);
                }
                catch (_j) {
                    // Non-fatal
                }
            }
            email_service_1.emailService.sendWelcome(parent.email, parent.name);
            const tokens = this.generateTokens(parent.id);
            return {
                tokens,
                user: { id: parent.id, email: parent.email, name: parent.name },
            };
        });
    }
    login(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const parent = yield this.parentRepo.findOne({
                where: { email: email.toLowerCase().trim() },
            });
            if (!parent)
                throw new Error("Invalid credentials");
            // Check account lockout
            if (parent.lockedUntil && parent.lockedUntil > new Date()) {
                const minutesLeft = Math.ceil((parent.lockedUntil.getTime() - Date.now()) / 60000);
                throw new Error(`Account temporarily locked. Try again in ${minutesLeft} minute(s).`);
            }
            const isValid = yield bcryptjs_1.default.compare(password, parent.passwordHash);
            if (!isValid) {
                parent.failedLoginAttempts = (parent.failedLoginAttempts || 0) + 1;
                if (parent.failedLoginAttempts >= 5) {
                    parent.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
                    console.warn(`[Auth] Account ${parent.email} locked after ${parent.failedLoginAttempts} failed attempts.`);
                }
                yield this.parentRepo.save(parent);
                throw new Error("Invalid credentials");
            }
            // Reset failed attempts on successful login
            parent.failedLoginAttempts = 0;
            parent.lockedUntil = null;
            yield this.parentRepo.save(parent);
            const tokens = this.generateTokens(parent.id);
            return {
                tokens,
                user: { id: parent.id, email: parent.email, name: parent.name },
            };
        });
    }
    refresh(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const decoded = jsonwebtoken_1.default.verify(refreshToken, JWT_REFRESH_SECRET);
                const parent = yield this.parentRepo.findOne({
                    where: { id: decoded.id },
                });
                if (!parent)
                    throw new Error("Invalid session");
                return this.generateTokens(parent.id);
            }
            catch (e) {
                throw new Error("Refresh token expired or invalid");
            }
        });
    }
    forgotPassword(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const parent = yield this.parentRepo.findOne({
                where: { email: email.toLowerCase().trim() },
            });
            if (!parent)
                return; // Silent return for security
            // Cryptographically secure 64-char hex token
            const resetToken = crypto_1.default.randomBytes(32).toString("hex");
            parent.resetPasswordToken = resetToken;
            parent.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
            yield this.parentRepo.save(parent);
            yield email_service_1.emailService.sendPasswordReset(parent.email, parent.name, resetToken);
            console.log(`[Auth] Password reset email dispatched to ${email}`);
        });
    }
    resetPassword(token, newPass) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!token || typeof token !== "string") {
                throw new Error("Reset token is invalid or has expired");
            }
            if (!newPass || newPass.length < 8) {
                throw new Error("New password must be at least 8 characters");
            }
            const parent = yield this.parentRepo.findOne({
                where: { resetPasswordToken: token },
            });
            if (!parent ||
                !parent.resetPasswordExpires ||
                parent.resetPasswordExpires < new Date()) {
                throw new Error("Reset token is invalid or has expired");
            }
            parent.passwordHash = yield bcryptjs_1.default.hash(newPass, 12);
            parent.resetPasswordToken = null;
            parent.resetPasswordExpires = null;
            yield this.parentRepo.save(parent);
            return true;
        });
    }
    generateTokens(userId) {
        const accessToken = jsonwebtoken_1.default.sign({ id: userId, role: "parent" }, JWT_SECRET, {
            expiresIn: "1h",
        });
        const refreshToken = jsonwebtoken_1.default.sign({ id: userId }, JWT_REFRESH_SECRET, {
            expiresIn: "7d",
        });
        return { accessToken, refreshToken };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map