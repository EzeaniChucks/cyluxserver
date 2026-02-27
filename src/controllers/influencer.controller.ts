import { Request, Response } from 'express';
import { influencerService } from '../services/influencer.service';
import { ApiResponse } from '../utils/response';

export class InfluencerController {
  // ─── Public ───────────────────────────────────────────────────────────────

  validateCode = async (req: any, res: any) => {
    try {
      const { code } = req.params;
      if (!code) return ApiResponse.error(res, 'Code is required', 400);
      const result = await influencerService.validateCode(code);
      if (!result) return ApiResponse.success(res, { valid: false }, 'Invalid or inactive code');
      return ApiResponse.success(res, result, 'Code validated');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  // ─── Auth ─────────────────────────────────────────────────────────────────

  login = async (req: any, res: any) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return ApiResponse.error(res, 'Email and password required', 400);
      const result = await influencerService.login(email, password);
      return ApiResponse.success(res, result, 'Login successful');
    } catch (err: any) {
      return ApiResponse.error(res, err.message, 401);
    }
  };

  // ─── Protected (influencer self-serve) ───────────────────────────────────

  getDashboard = async (req: any, res: any) => {
    try {
      const dashboard = await influencerService.getDashboard(req.influencer.id);
      return ApiResponse.success(res, dashboard, 'Dashboard data');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  getReferrals = async (req: any, res: any) => {
    try {
      const referrals = await influencerService.getReferrals(req.influencer.id);
      // Mask referred user emails for privacy
      const masked = referrals.map(r => ({
        ...r,
        referredParent: r.referredParent
          ? { id: r.referredParent.id, email: r.referredParent.email.replace(/(.{2}).*(@.*)/, '$1***$2') }
          : null,
      }));
      return ApiResponse.success(res, masked, 'Referrals');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  updateProfile = async (req: any, res: any) => {
    try {
      const { name, password } = req.body;
      await influencerService.updateProfile(req.influencer.id, { name, password });
      return ApiResponse.success(res, null, 'Profile updated');
    } catch (err: any) {
      return ApiResponse.error(res, err.message, 400);
    }
  };
}

export const influencerController = new InfluencerController();
