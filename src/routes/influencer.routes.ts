import { Router } from 'express';
import { influencerController } from '../controllers/influencer.controller';
import { protectInfluencer } from '../middlewares/auth';
import { walletService } from '../services/wallet.service';
import { ApiResponse } from '../utils/response';

const router = Router();

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/validate/:code', influencerController.validateCode);
router.post('/auth/login', influencerController.login);

// ── Protected (influencer token required) ───────────────────────────────────
router.get('/dashboard', protectInfluencer, influencerController.getDashboard);
router.get('/referrals', protectInfluencer, influencerController.getReferrals);
router.patch('/profile', protectInfluencer, influencerController.updateProfile);

// ── Wallet (mounted here so influencerApi base /api/influencer aligns) ───────
router.get('/wallet', protectInfluencer, async (req: any, res: any) => {
  try {
    const wallet = await walletService.getWalletSummary(req.influencer.id, 'influencer');
    return ApiResponse.success(res, wallet, 'Wallet');
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

router.get('/wallet/transactions', protectInfluencer, async (req: any, res: any) => {
  try {
    const { page, limit } = req.query;
    const result = await walletService.getTransactions(
      req.influencer.id, 'influencer',
      page ? parseInt(page as string) : 1,
      limit ? parseInt(limit as string) : 20,
    );
    return ApiResponse.success(res, result, 'Transactions');
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

router.post('/wallet/connect', protectInfluencer, async (req: any, res: any) => {
  try {
    const { returnUrl, refreshUrl } = req.body;
    if (!returnUrl || !refreshUrl) return ApiResponse.error(res, 'returnUrl and refreshUrl required', 400);
    const url = await walletService.getConnectOnboardingUrl(
      req.influencer.id, 'influencer', req.influencer.email, returnUrl, refreshUrl,
    );
    return ApiResponse.success(res, { url }, 'Onboarding URL');
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

router.post('/wallet/withdraw', protectInfluencer, async (req: any, res: any) => {
  try {
    const { amountUsd } = req.body;
    if (!amountUsd || isNaN(parseFloat(amountUsd))) {
      return ApiResponse.error(res, 'Valid amountUsd required', 400);
    }
    const tx = await walletService.withdraw(req.influencer.id, 'influencer', parseFloat(amountUsd));
    return ApiResponse.success(res, tx, 'Withdrawal initiated');
  } catch (e: any) {
    return ApiResponse.error(res, e.message, 400);
  }
});

export default router;
