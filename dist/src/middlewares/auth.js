"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectInfluencer = exports.protectAdmin = exports.protectChild = exports.protectParent = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const response_1 = require("../utils/response");
const JWT_SECRET = process.env.JWT_SECRET;
const DEVICE_JWT_SECRET = process.env.DEVICE_JWT_SECRET;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
const INFLUENCER_JWT_SECRET = process.env.INFLUENCER_JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET must be set in environment variables');
}
if (!DEVICE_JWT_SECRET) {
    throw new Error('FATAL: DEVICE_JWT_SECRET must be set in environment variables');
}
const protectParent = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return response_1.ApiResponse.error(res, 'Unauthorized: No token provided', 401);
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (decoded.role !== 'parent') {
            return response_1.ApiResponse.error(res, 'Unauthorized: Access denied', 403);
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        return response_1.ApiResponse.error(res, `Unauthorized: ${message}`, 401);
    }
};
exports.protectParent = protectParent;
// Device JWT verification — replaces the insecure X-Device-ID header check
const protectChild = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return response_1.ApiResponse.error(res, 'Unauthorized: Device token required', 401);
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, DEVICE_JWT_SECRET);
        if (decoded.role !== 'child') {
            return response_1.ApiResponse.error(res, 'Unauthorized: Invalid device token', 403);
        }
        req.deviceId = decoded.deviceId;
        next();
    }
    catch (error) {
        const message = error.name === 'TokenExpiredError' ? 'Device token expired' : 'Invalid device token';
        return response_1.ApiResponse.error(res, `Unauthorized: ${message}`, 401);
    }
};
exports.protectChild = protectChild;
/**
 * Admin JWT middleware with optional role-based access control.
 * Usage: protectAdmin(['superadmin', 'admin']) or protectAdmin() for any admin role.
 */
const protectAdmin = (allowedRoles) => (req, res, next) => {
    if (!ADMIN_JWT_SECRET) {
        return response_1.ApiResponse.error(res, 'Admin auth not configured', 500);
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return response_1.ApiResponse.error(res, 'Unauthorized: No token provided', 401);
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, ADMIN_JWT_SECRET);
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
            return response_1.ApiResponse.error(res, 'Forbidden: Insufficient permissions', 403);
        }
        req.admin = decoded;
        next();
    }
    catch (error) {
        const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        return response_1.ApiResponse.error(res, `Unauthorized: ${message}`, 401);
    }
};
exports.protectAdmin = protectAdmin;
/**
 * Influencer JWT middleware for the influencer self-serve portal.
 */
const protectInfluencer = (req, res, next) => {
    if (!INFLUENCER_JWT_SECRET) {
        return response_1.ApiResponse.error(res, 'Influencer auth not configured', 500);
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return response_1.ApiResponse.error(res, 'Unauthorized: No token provided', 401);
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, INFLUENCER_JWT_SECRET);
        req.influencer = decoded;
        next();
    }
    catch (error) {
        const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        return response_1.ApiResponse.error(res, `Unauthorized: ${message}`, 401);
    }
};
exports.protectInfluencer = protectInfluencer;
//# sourceMappingURL=auth.js.map