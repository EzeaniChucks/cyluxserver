"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_1 = require("../middlewares/auth");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
// ── Open (no auth) ──────────────────────────────────────────────────────────
router.post('/auth/seed', rateLimiter_1.authLimiter, admin_controller_1.adminController.seed);
router.post('/auth/login', rateLimiter_1.authLimiter, admin_controller_1.adminController.login);
// ── Protected (admin token required) ───────────────────────────────────────
router.get('/stats', (0, auth_1.protectAdmin)(['superadmin', 'admin', 'support']), admin_controller_1.adminController.getStats);
router.get('/revenue', (0, auth_1.protectAdmin)(['superadmin', 'admin']), admin_controller_1.adminController.getRevenue);
// Parents
router.get('/parents', (0, auth_1.protectAdmin)(['superadmin', 'admin', 'support']), admin_controller_1.adminController.getParents);
router.get('/parents/:id', (0, auth_1.protectAdmin)(['superadmin', 'admin', 'support']), admin_controller_1.adminController.getParent);
router.patch('/parents/:id', (0, auth_1.protectAdmin)(['superadmin', 'admin']), admin_controller_1.adminController.updateParent);
router.patch('/parents/:id/subscription', (0, auth_1.protectAdmin)(['superadmin', 'admin']), admin_controller_1.adminController.overrideSubscription);
router.delete('/parents/:id', (0, auth_1.protectAdmin)(['superadmin']), admin_controller_1.adminController.deleteParent);
// Subscriptions
router.get('/subscriptions', (0, auth_1.protectAdmin)(['superadmin', 'admin', 'support']), admin_controller_1.adminController.getSubscriptions);
// Plans
router.get('/plans', (0, auth_1.protectAdmin)(['superadmin', 'admin', 'support']), admin_controller_1.adminController.getPlans);
router.post('/plans', (0, auth_1.protectAdmin)(['superadmin']), admin_controller_1.adminController.createPlan);
router.patch('/plans/:planId', (0, auth_1.protectAdmin)(['superadmin']), admin_controller_1.adminController.updatePlan);
router.delete('/plans/:planId', (0, auth_1.protectAdmin)(['superadmin']), admin_controller_1.adminController.deactivatePlan);
// Parent Referral Program Config
router.get('/parent-referral-config', (0, auth_1.protectAdmin)(['superadmin', 'admin']), admin_controller_1.adminController.getParentReferralConfig);
router.patch('/parent-referral-config', (0, auth_1.protectAdmin)(['superadmin']), admin_controller_1.adminController.updateParentReferralConfig);
// Influencers
router.get('/influencers', (0, auth_1.protectAdmin)(['superadmin', 'admin']), admin_controller_1.adminController.getInfluencers);
router.post('/influencers', (0, auth_1.protectAdmin)(['superadmin', 'admin']), admin_controller_1.adminController.createInfluencer);
router.patch('/influencers/:id', (0, auth_1.protectAdmin)(['superadmin', 'admin']), admin_controller_1.adminController.updateInfluencer);
router.delete('/influencers/:id', (0, auth_1.protectAdmin)(['superadmin']), admin_controller_1.adminController.deleteInfluencer);
router.get('/influencers/:id/referrals', (0, auth_1.protectAdmin)(['superadmin', 'admin']), admin_controller_1.adminController.getInfluencerReferrals);
router.patch('/referrals/:id/paid', (0, auth_1.protectAdmin)(['superadmin', 'admin']), admin_controller_1.adminController.markRewardPaid);
// Payout Config
router.get('/payout-config', (0, auth_1.protectAdmin)(['superadmin', 'admin']), admin_controller_1.adminController.getPayoutConfig);
router.patch('/payout-config', (0, auth_1.protectAdmin)(['superadmin']), admin_controller_1.adminController.updatePayoutConfig);
// Wallets & Withdrawals
router.get('/wallets', (0, auth_1.protectAdmin)(['superadmin', 'admin']), admin_controller_1.adminController.getWallets);
router.get('/withdrawals', (0, auth_1.protectAdmin)(['superadmin', 'admin']), admin_controller_1.adminController.getWithdrawals);
// System Config (Gemini key, etc.)
router.get('/system-config', (0, auth_1.protectAdmin)(['superadmin']), admin_controller_1.adminController.getSystemConfig);
router.patch('/system-config', (0, auth_1.protectAdmin)(['superadmin']), admin_controller_1.adminController.updateSystemConfig);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map