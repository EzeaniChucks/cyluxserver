import { Router, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { ApiResponse } from '../utils/response';
import { protectParent, protectChild } from '../middlewares/auth';
import { AuthenticatedRequest, ChildRequest } from '../types/request';

const router = Router();
const notificationService = new NotificationService();

// Fixed: Changed req type to any to avoid signature mismatch and property access errors
router.post('/register-parent', protectParent, async (req: any, res: Response) => {
  try {
    const { token, deviceType } = req.body;
    if (!token || !deviceType) return ApiResponse.error(res, 'Token and deviceType are required', 400);
    
    const parentId = req.user?.id;
    if (!parentId) return ApiResponse.error(res, 'Unauthorized', 401);

    await notificationService.registerToken(parentId, token, 'parent', deviceType);
    return ApiResponse.success(res, null, 'Parent token and device info registered');
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

// Fixed: Changed req type to any to avoid signature mismatch and property access errors
router.post('/register-child', protectChild, async (req: any, res: Response) => {
  try {
    const { token, deviceType } = req.body;
    if (!token || !deviceType) return ApiResponse.error(res, 'Token and deviceType are required', 400);

    const deviceId = req.deviceId;
    if (!deviceId) return ApiResponse.error(res, 'Device ID required', 401);

    await notificationService.registerToken(deviceId, token, 'child', deviceType);
    return ApiResponse.success(res, null, 'Child token and device info registered');
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

// Fixed: Changed req type to any to avoid signature mismatch
router.get('/inbox', protectParent, async (req: any, res: Response) => {
    try {
        const parentId = req.user?.id;
        if (!parentId) return ApiResponse.error(res, 'Unauthorized', 401);

        const notifications = await notificationService.getNotifications(parentId);
        return ApiResponse.success(res, notifications);
    } catch (e: any) {
        return ApiResponse.error(res, e.message);
    }
});

router.patch('/:id/read', protectParent, async (req: any, res: Response) => {
    try {
        const parentId = req.user?.id;
        if (!parentId) return ApiResponse.error(res, 'Unauthorized', 401);
        await notificationService.markAsRead(req.params.id, parentId);
        return ApiResponse.success(res, null, 'Marked as read');
    } catch (e: any) {
        return ApiResponse.error(res, e.message);
    }
});

export default router;