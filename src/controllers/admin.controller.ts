import { Request, Response } from 'express';
import { adminService } from '../services/admin.service';
import { influencerService } from '../services/influencer.service';
import { parentReferralService } from '../services/parentReferral.service';
import { walletService } from '../services/wallet.service';
import { ApiResponse } from '../utils/response';

export class AdminController {
  // ─── Auth ─────────────────────────────────────────────────────────────────

  seed = async (req: any, res: any) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) return ApiResponse.error(res, 'Missing fields', 400);
      const admin = await adminService.seedFirstAdmin({ email, password, name });
      return ApiResponse.success(res, { id: admin.id, email: admin.email }, 'Superadmin created', 201);
    } catch (err: any) {
      return ApiResponse.error(res, err.message, 400);
    }
  };

  login = async (req: any, res: any) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return ApiResponse.error(res, 'Email and password required', 400);
      const result = await adminService.login(email, password);
      return ApiResponse.success(res, result, 'Login successful');
    } catch (err: any) {
      return ApiResponse.error(res, err.message, 401);
    }
  };

  // ─── Stats ────────────────────────────────────────────────────────────────

  getStats = async (req: any, res: any) => {
    try {
      const stats = await adminService.getPlatformStats();
      return ApiResponse.success(res, stats, 'Platform stats');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  // ─── Parents ──────────────────────────────────────────────────────────────

  getParents = async (req: any, res: any) => {
    try {
      const { page, limit, search, plan, status } = req.query;
      const result = await adminService.getParents({
        page: page ? parseInt(String(page)) : undefined,
        limit: limit ? parseInt(String(limit)) : undefined,
        search: search ? String(search) : undefined,
        plan: plan ? String(plan) : undefined,
        status: status ? String(status) : undefined,
      });
      return ApiResponse.success(res, result, 'Parents list');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  getParent = async (req: any, res: any) => {
    try {
      const parent = await adminService.getParentById(req.params.id);
      if (!parent) return ApiResponse.error(res, 'Parent not found', 404);
      return ApiResponse.success(res, parent, 'Parent details');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  updateParent = async (req: any, res: any) => {
    try {
      const parent = await adminService.updateParent(req.params.id, req.body);
      return ApiResponse.success(res, parent, 'Parent updated');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  overrideSubscription = async (req: any, res: any) => {
    try {
      const sub = await adminService.overrideSubscription(req.params.id, req.body, req.admin.id);
      return ApiResponse.success(res, sub, 'Subscription updated');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  deleteParent = async (req: any, res: any) => {
    try {
      await adminService.deleteParent(req.params.id);
      return ApiResponse.success(res, null, 'Parent deleted');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  // ─── Subscriptions ────────────────────────────────────────────────────────

  getSubscriptions = async (req: any, res: any) => {
    try {
      const { page, limit, plan, status } = req.query;
      const result = await adminService.getSubscriptions({
        page: page ? parseInt(String(page)) : undefined,
        limit: limit ? parseInt(String(limit)) : undefined,
        plan: plan ? String(plan) : undefined,
        status: status ? String(status) : undefined,
      });
      return ApiResponse.success(res, result, 'Subscriptions list');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  // ─── Plan Configs ─────────────────────────────────────────────────────────

  getPlans = async (req: any, res: any) => {
    try {
      const plans = await adminService.getPlanConfigs();
      return ApiResponse.success(res, plans, 'Plan configs');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  updatePlan = async (req: any, res: any) => {
    try {
      const plan = await adminService.updatePlanConfig(req.params.planId, req.body, req.admin.id);
      return ApiResponse.success(res, plan, 'Plan config updated');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  // ─── Influencers ──────────────────────────────────────────────────────────

  getInfluencers = async (req: any, res: any) => {
    try {
      const list = await influencerService.getInfluencers();
      return ApiResponse.success(res, list, 'Influencers');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  createInfluencer = async (req: any, res: any) => {
    try {
      const { name, email, password, code, discountPercent, rewardType, rewardValue } = req.body;
      if (!name || !email || !password || !code) {
        return ApiResponse.error(res, 'name, email, password, and code are required', 400);
      }
      const influencer = await influencerService.createInfluencer({
        name, email, password, code, discountPercent, rewardType, rewardValue,
      });
      return ApiResponse.success(res, influencer, 'Influencer created', 201);
    } catch (err: any) {
      return ApiResponse.error(res, err.message, 400);
    }
  };

  updateInfluencer = async (req: any, res: any) => {
    try {
      const influencer = await influencerService.updateInfluencer(req.params.id, req.body);
      return ApiResponse.success(res, influencer, 'Influencer updated');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  deleteInfluencer = async (req: any, res: any) => {
    try {
      await influencerService.deactivateInfluencer(req.params.id);
      return ApiResponse.success(res, null, 'Influencer deactivated');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  getInfluencerReferrals = async (req: any, res: any) => {
    try {
      const referrals = await influencerService.getReferrals(req.params.id);
      return ApiResponse.success(res, referrals, 'Referrals');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  markRewardPaid = async (req: any, res: any) => {
    try {
      const referral = await influencerService.markRewardPaid(req.params.id);
      return ApiResponse.success(res, referral, 'Reward marked as paid');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  // ─── Parent Referral Config ───────────────────────────────────────────────

  getParentReferralConfig = async (req: any, res: any) => {
    try {
      const config = await parentReferralService.getConfig();
      return ApiResponse.success(res, config, 'Parent referral config');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  updateParentReferralConfig = async (req: any, res: any) => {
    try {
      const { isEnabled, rewardType, rewardValue, referredDiscountPercent } = req.body;
      const config = await parentReferralService.updateConfig(
        { isEnabled, rewardType, rewardValue, referredDiscountPercent },
        req.admin.id,
      );
      return ApiResponse.success(res, config, 'Parent referral config updated');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  // ─── Revenue ──────────────────────────────────────────────────────────────

  getRevenue = async (req: any, res: any) => {
    try {
      const revenue = await adminService.getRevenue();
      return ApiResponse.success(res, revenue, 'Revenue metrics');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  // ─── Payout Config ────────────────────────────────────────────────────────

  getPayoutConfig = async (req: any, res: any) => {
    try {
      const config = await walletService.getPayoutConfig();
      return ApiResponse.success(res, config, 'Payout config');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  updatePayoutConfig = async (req: any, res: any) => {
    try {
      const { minWithdrawalUsdInfluencer, minWithdrawalUsdParent, holdDays } = req.body;
      const config = await walletService.updatePayoutConfig(
        { minWithdrawalUsdInfluencer, minWithdrawalUsdParent, holdDays },
        req.admin.id,
      );
      return ApiResponse.success(res, config, 'Payout config updated');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  // ─── Wallets overview ─────────────────────────────────────────────────────

  getWallets = async (req: any, res: any) => {
    try {
      const { page, limit, ownerType } = req.query;
      const result = await walletService.getAllWallets(
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 20,
        ownerType as any,
      );
      return ApiResponse.success(res, result, 'Wallets');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  getWithdrawals = async (req: any, res: any) => {
    try {
      const { page, limit } = req.query;
      const result = await walletService.getWithdrawalHistory(
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 20,
      );
      return ApiResponse.success(res, result, 'Withdrawal history');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };
}

export const adminController = new AdminController();
