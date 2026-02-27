"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalLimiter = exports.pairingLimiter = exports.strictLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// NOTE: Uses in-memory store (default). For multi-process / clustered deployments,
// replace with a shared store (e.g. rate-limit-redis) to ensure limits apply across workers.
// For login, register, forgot-password: 10 attempts per 15 minutes per IP
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
});
// For password reset submission: 5 attempts per hour per IP
exports.strictLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many password reset attempts. Try again later.' },
});
// For device pairing: 5 attempts per 15 minutes per IP
exports.pairingLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many pairing attempts. Wait before retrying.' },
});
// Global limiter applied to all /api/* routes: 200 requests per minute per IP
exports.globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Rate limit exceeded. Slow down.' },
});
//# sourceMappingURL=rateLimiter.js.map