import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { protectAdmin } from '../middlewares/auth';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

// ── Open (no auth) ──────────────────────────────────────────────────────────
router.post('/auth/seed', authLimiter, adminController.seed);
router.post('/auth/login', authLimiter, adminController.login);

// ── Protected (admin token required) ───────────────────────────────────────
router.get('/stats', protectAdmin(['superadmin', 'admin', 'support']), adminController.getStats);
router.get('/revenue', protectAdmin(['superadmin', 'admin']), adminController.getRevenue);

// Parents
router.get('/parents', protectAdmin(['superadmin', 'admin', 'support']), adminController.getParents);
router.get('/parents/:id', protectAdmin(['superadmin', 'admin', 'support']), adminController.getParent);
router.patch('/parents/:id', protectAdmin(['superadmin', 'admin']), adminController.updateParent);
router.patch('/parents/:id/subscription', protectAdmin(['superadmin', 'admin']), adminController.overrideSubscription);
router.delete('/parents/:id', protectAdmin(['superadmin']), adminController.deleteParent);

// Subscriptions
router.get('/subscriptions', protectAdmin(['superadmin', 'admin', 'support']), adminController.getSubscriptions);

// Plans
router.get('/plans', protectAdmin(['superadmin', 'admin', 'support']), adminController.getPlans);
router.post('/plans', protectAdmin(['superadmin']), adminController.createPlan);
router.patch('/plans/:planId', protectAdmin(['superadmin']), adminController.updatePlan);
router.delete('/plans/:planId', protectAdmin(['superadmin']), adminController.deactivatePlan);

// Parent Referral Program Config
router.get('/parent-referral-config', protectAdmin(['superadmin', 'admin']), adminController.getParentReferralConfig);
router.patch('/parent-referral-config', protectAdmin(['superadmin']), adminController.updateParentReferralConfig);

// Influencers
router.get('/influencers', protectAdmin(['superadmin', 'admin']), adminController.getInfluencers);
router.post('/influencers', protectAdmin(['superadmin', 'admin']), adminController.createInfluencer);
router.patch('/influencers/:id', protectAdmin(['superadmin', 'admin']), adminController.updateInfluencer);
router.delete('/influencers/:id', protectAdmin(['superadmin']), adminController.deleteInfluencer);
router.get('/influencers/:id/referrals', protectAdmin(['superadmin', 'admin']), adminController.getInfluencerReferrals);
router.patch('/referrals/:id/paid', protectAdmin(['superadmin', 'admin']), adminController.markRewardPaid);

// Payout Config
router.get('/payout-config', protectAdmin(['superadmin', 'admin']), adminController.getPayoutConfig);
router.patch('/payout-config', protectAdmin(['superadmin']), adminController.updatePayoutConfig);

// Wallets & Withdrawals
router.get('/wallets', protectAdmin(['superadmin', 'admin']), adminController.getWallets);
router.get('/withdrawals', protectAdmin(['superadmin', 'admin']), adminController.getWithdrawals);

// System Config (Gemini key, etc.)
router.get('/system-config', protectAdmin(['superadmin']), adminController.getSystemConfig);
router.patch('/system-config', protectAdmin(['superadmin']), adminController.updateSystemConfig);

export default router;
