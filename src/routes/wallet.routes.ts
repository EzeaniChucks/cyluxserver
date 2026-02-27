import { Router } from 'express';
import { protectParent } from '../middlewares/auth';
import { walletService } from '../services/wallet.service';
import { ApiResponse } from '../utils/response';
import { AppDataSource } from '../database';
import { SubscriptionEntity } from '../entities/Subscription';

const router = Router();

// ── Parent wallet ────────────────────────────────────────────────────────────

router.get('/parent', protectParent, async (req: any, res: any) => {
  try {
    const wallet = await walletService.getWalletSummary(req.user.id, 'parent');
    return ApiResponse.success(res, wallet, 'Wallet');
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

router.get('/parent/transactions', protectParent, async (req: any, res: any) => {
  try {
    const { page, limit } = req.query;
    const result = await walletService.getTransactions(
      req.user.id, 'parent',
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
    return ApiResponse.success(res, result, 'Transactions');
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

router.post('/parent/connect', protectParent, async (req: any, res: any) => {
  try {
    const { returnUrl, refreshUrl } = req.body;
    if (!returnUrl || !refreshUrl) return ApiResponse.error(res, 'returnUrl and refreshUrl required', 400);
    const url = await walletService.getConnectOnboardingUrl(
      req.user.id, 'parent', req.user.email, returnUrl, refreshUrl,
    );
    return ApiResponse.success(res, { url }, 'Onboarding URL');
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

router.post('/parent/withdraw', protectParent, async (req: any, res: any) => {
  try {
    const { amountUsd } = req.body;
    if (!amountUsd || isNaN(parseFloat(amountUsd))) {
      return ApiResponse.error(res, 'Valid amountUsd required', 400);
    }
    const tx = await walletService.withdraw(req.user.id, 'parent', parseFloat(amountUsd));
    return ApiResponse.success(res, tx, 'Withdrawal initiated');
  } catch (e: any) {
    return ApiResponse.error(res, e.message, 400);
  }
});

router.post('/parent/apply-credit', protectParent, async (req: any, res: any) => {
  try {
    const { amountUsd } = req.body;
    if (!amountUsd || isNaN(parseFloat(amountUsd))) {
      return ApiResponse.error(res, 'Valid amountUsd required', 400);
    }
    // Look up the parent's Stripe customer ID from their subscription
    const subRepo = AppDataSource.getRepository(SubscriptionEntity);
    const sub = await subRepo.findOne({ where: { parentId: req.user.id } });
    if (!sub?.stripeCustomerId) {
      return ApiResponse.error(res, 'No active subscription found', 400);
    }
    await walletService.applyBillingCredit(req.user.id, 'parent', parseFloat(amountUsd), sub.stripeCustomerId);
    return ApiResponse.success(res, null, 'Billing credit applied');
  } catch (e: any) {
    return ApiResponse.error(res, e.message, 400);
  }
});

export default router;
