import { Request, Response } from 'express';
import { AlertService } from '../services/alert.service';
import { ApiResponse } from '../utils/response';

export class AlertController {
  private alertService = new AlertService();

  getAlerts = async (req: any, res: any) => {
    try {
      const parentId = req.user?.id;
      if (!parentId) return ApiResponse.error(res, 'Unauthorized', 401);
      const { page = 1, limit = 50 } = req.query;
      const result = await this.alertService.getAllAlerts(parentId, Number(page), Number(limit));
      return ApiResponse.success(res, result);
    } catch (error: any) {
      return ApiResponse.error(res, error.message);
    }
  };

  getLogs = async (req: any, res: any) => {
    try {
      const { childId } = req.params;
      const parentId = req.user?.id;
      if (!parentId) return ApiResponse.error(res, 'Unauthorized', 401);
      const { page = 1, limit = 100 } = req.query;
      const result = await this.alertService.getLogsByChildId(childId, parentId, Number(page), Number(limit));
      return ApiResponse.success(res, result);
    } catch (error: any) {
      return ApiResponse.error(res, error.message);
    }
  };

  createLog = async (req: any, res: any) => {
    try {
      const log = await this.alertService.createLog(req.body);
      if (!log) return ApiResponse.error(res, 'Log rejected: invalid data or unenrolled device', 400);
      return ApiResponse.success(res, log, 'Log recorded', 201);
    } catch (error: any) {
      return ApiResponse.error(res, error.message);
    }
  };
}
