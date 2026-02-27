"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscription_controller_1 = require("../controllers/subscription.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Public — no auth required
router.get('/plans', subscription_controller_1.subscriptionController.getPlans);
// Parent-authenticated routes
router.get('/', auth_1.protectParent, subscription_controller_1.subscriptionController.getSubscription);
router.post('/checkout', auth_1.protectParent, subscription_controller_1.subscriptionController.createCheckout);
router.post('/portal', auth_1.protectParent, subscription_controller_1.subscriptionController.createPortal);
router.post('/cancel', auth_1.protectParent, subscription_controller_1.subscriptionController.cancelSubscription);
// Note: POST /webhook is registered directly in index.ts (before express.json())
// so Stripe's signature verification can access the raw body.
exports.default = router;
//# sourceMappingURL=subscription.routes.js.map