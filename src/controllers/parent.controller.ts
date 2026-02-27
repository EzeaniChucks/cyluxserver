import { Response } from 'express';
import { ParentService } from '../services/parent.service';
import { ApiResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types/request';

export class ParentController {
  private parentService = new ParentService();

  // Fixed: Changed req type to any for compatibility with Express Router signatures
  getMe = async (req: any, res: Response) => {
    try {
      const parentId = req.user?.id;
      if (!parentId) return ApiResponse.error(res, 'Unauthorized', 401);
      
      const profile = await this.parentService.getParentProfile(parentId);
      return ApiResponse.success(res, profile);
    } catch (error: any) {
      return ApiResponse.error(res, error.message);
    }
  };

  // Fixed: Changed req type to any for compatibility with Express Router signatures
  getDashboard = async (req: any, res: Response) => {
    try {
      const parentId = req.user?.id;
      if (!parentId) return ApiResponse.error(res, 'Unauthorized', 401);

      const summary = await this.parentService.getDashboardSummary(parentId);
      return ApiResponse.success(res, summary, 'Dashboard data synced');
    } catch (error: any) {
      return ApiResponse.error(res, error.message);
    }
  };

  // Fixed: Changed req type to any to avoid property access errors (body) with custom AuthenticatedRequest
  updateMe = async (req: any, res: Response) => {
    try {
      const parentId = req.user?.id;
      if (!parentId) return ApiResponse.error(res, 'Unauthorized', 401);

      const updatedProfile = await this.parentService.updateProfile(parentId, req.body);
      return ApiResponse.success(res, updatedProfile, 'Profile updated');
    } catch (error: any) {
      return ApiResponse.error(res, error.message);
    }
  };
}