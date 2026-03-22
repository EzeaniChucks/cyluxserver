"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
const authController = new auth_controller_1.AuthController();
router.post('/detect-locale', rateLimiter_1.authLimiter, authController.detectLocale);
router.post('/register', rateLimiter_1.authLimiter, authController.register);
router.post('/login', rateLimiter_1.authLimiter, authController.login);
router.post('/refresh', rateLimiter_1.refreshLimiter, authController.refresh);
router.post('/forgot-password', rateLimiter_1.authLimiter, authController.forgotPassword);
router.post('/reset-password', rateLimiter_1.strictLimiter, authController.resetPassword);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map