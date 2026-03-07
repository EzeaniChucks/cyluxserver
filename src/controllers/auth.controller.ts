import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { geoService } from '../services/geo.service';
import { ApiResponse } from '../utils/response';

export class AuthController {
  private authService = new AuthService();

  register = async (req: any, res: any) => {
    try {
      const { email, password, name, referralCode, timezone, locale, simMcc } = req.body;
      if (!email || !password || !name) {
        return ApiResponse.error(res, 'Missing registration fields', 400);
      }
      // Geo detection runs server-side — client signals are hints only;
      // the actual IP (not client-supplied) is the authoritative source.
      const geo = await geoService.detect(req, { timezone, locale, simMcc });
      const result = await this.authService.register({ email, password, name, referralCode, ...geo });
      return ApiResponse.success(res, result, 'Account created successfully', 201);
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 400);
    }
  };

  detectLocale = async (req: any, res: any) => {
    try {
      const { timezone, locale, simMcc } = req.body;
      const result = await geoService.detect(req, { timezone, locale, simMcc });
      return ApiResponse.success(res, result, 'Locale detected');
    } catch (error: any) {
      return ApiResponse.error(res, error.message);
    }
  };

  login = async (req: any, res: any) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return ApiResponse.error(res, 'Email and password required', 400);
      }
      const result = await this.authService.login(email, password);
      return ApiResponse.success(res, result, 'Login successful');
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 401);
    }
  };

  refresh = async (req: any, res: any) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return ApiResponse.error(res, 'Refresh token required', 400);
      const tokens = await this.authService.refresh(refreshToken);
      return ApiResponse.success(res, tokens, 'Tokens rotated');
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 401);
    }
  };

  forgotPassword = async (req: any, res: any) => {
    try {
      const { email } = req.body;
      await this.authService.forgotPassword(email);
      return ApiResponse.success(res, null, 'If that email exists, a reset link has been sent');
    } catch (error: any) {
      return ApiResponse.error(res, error.message);
    }
  };

  resetPassword = async (req: any, res: any) => {
    try {
      const { token, password } = req.body;
      await this.authService.resetPassword(token, password);
      return ApiResponse.success(res, null, 'Password updated successfully');
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 400);
    }
  };
}