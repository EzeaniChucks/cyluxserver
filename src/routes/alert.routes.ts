import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller';
import { protectParent, protectChild } from '../middlewares/auth';
import { ChildService } from '../services/child.service';
import { ApiResponse } from '../utils/response';

const router = Router();
const alertController = new AlertController();
const childService = new ChildService();

// Parent focused (Protected)
router.get('/alerts', protectParent, alertController.getAlerts);
router.get('/logs/:childId', protectParent, alertController.getLogs);

// Inbound logs from child devices (protected by device JWT)
router.post('/logs', protectChild, async (req: any, res: any) => {
  // Override childId with the authenticated device ID — prevents logging for other devices
  req.body.childId = req.deviceId;
  return alertController.createLog(req, res);
});

// High-performance batch ingestion for offline recovery (protected by device JWT)
router.post('/logs/batch', protectChild, async (req: any, res: any) => {
  try {
    let { logs } = req.body;
    if (!Array.isArray(logs) || logs.length === 0) {
      return ApiResponse.error(res, 'Invalid batch format', 400);
    }
    if (logs.length > 500) {
      return ApiResponse.error(res, 'Batch too large. Maximum 500 logs per request.', 400);
    }
    // Stamp every entry with the authenticated device ID — same as the /logs endpoint
    // does with req.body.childId = req.deviceId. Without this, processLogBatch sees
    // childId=undefined on every entry and the ownership filter drops them all.
    logs = logs.map((l: any) => ({ ...l, childId: req.deviceId }));
    await childService.processLogBatch(logs, req.deviceId);
    return ApiResponse.success(res, null, `Ingested batch of logs`);
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

export default router;
