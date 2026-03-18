import { Response } from 'express';
import { ChildService } from '../services/child.service';
import { ApiResponse } from '../utils/response';
import { AppDataSource } from '../database';
import { ChildEntity } from '../entities/Child';
import { CommandEntity } from '../entities/Command';
import { AuditLogEntity } from '../entities/AuditLog';

const VALID_COMMAND_TYPES = [
  'LOCK', 'UNLOCK', 'PLAY_SIREN', 'SYNC_POLICY', 'WIPE_BROWSER',
  'REMOTE_WIPE', 'REBOOT', 'INVENTORY_SCAN',
  'HIDE_ICON', 'SHOW_ICON', 'SET_PARENT_PIN',
  'ENABLE_SETTINGS_GUARD', 'DISABLE_SETTINGS_GUARD',
];

export class ChildController {
  private childService = new ChildService();
  private childRepo = AppDataSource.getRepository(ChildEntity);
  private commandRepo = AppDataSource.getRepository(CommandEntity);
  private logRepo = AppDataSource.getRepository(AuditLogEntity);

  heartbeat = async (req: any, res: Response) => {
    try {
      const childId = req.params.childId || req.deviceId;
      if (!childId) return ApiResponse.error(res, 'Device context missing', 400);

      const result = await this.childService.processHeartbeat(childId, req.body);
      return ApiResponse.success(res, result, 'Heartbeat synced');
    } catch (error: any) {
      console.log("heartbeat error", error.message)
      return ApiResponse.error(res, error.message);
    }
  };

  triggerCommand = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const parentId = req.user?.id;

      const child = await this.childRepo.findOne({
        where: { id, parent: { id: parentId } as any },
      });
      if (!child) return ApiResponse.error(res, 'Managed node not found or unauthorized', 403);

      const { type, payload } = req.body;

      // Validate command type
      if (!type || !VALID_COMMAND_TYPES.includes(type)) {
        return ApiResponse.error(res, `Invalid command type. Allowed: ${VALID_COMMAND_TYPES.join(', ')}`, 400);
      }

      // Validate payload is a plain object if provided
      if (payload !== undefined && payload !== null) {
        if (typeof payload !== 'object' || Array.isArray(payload)) {
          return ApiResponse.error(res, 'Command payload must be a plain object', 400);
        }
      }

      const command = await this.childService.queueCommand(id, type, payload || {});
      return ApiResponse.success(res, command, 'Command queued');
    } catch (error: any) {
      return ApiResponse.error(res, error.message);
    }
  };

  acknowledgeCommand = async (req: any, res: Response) => {
    try {
      const { childId, commandId } = req.params;
      const authenticatedDeviceId = req.deviceId;

      // Ensure device can only ACK its own commands
      if (childId !== authenticatedDeviceId) {
        return ApiResponse.error(res, 'Unauthorized: Cannot acknowledge commands for another device', 403);
      }

      const command = await this.commandRepo.findOne({
        where: { id: commandId, childId },
      });
      if (!command) return ApiResponse.error(res, 'Command not found', 404);

      command.status = 'executed';
      await this.commandRepo.save(command);

      // Audit log the execution
      await this.logRepo.save(
        this.logRepo.create({
          childId,
          actionType: 'COMMAND_EXECUTED' as any,
          details: `Command ${command.type} executed successfully`,
          metadata: { commandId, commandType: command.type, commandResult: 'success' } as any,
        })
      );

      return ApiResponse.success(res, null, 'Command acknowledged');
    } catch (error: any) {
      return ApiResponse.error(res, error.message);
    }
  };

  getChildren = async (req: any, res: Response) => {
    try {
      const parentId = req.user?.id;
      const { page = 1, limit = 20 } = req.query;
      const result = await this.childService.getChildrenPaginated(
        parentId,
        Number(page),
        Number(limit)
      );
      return ApiResponse.success(res, result);
    } catch (error: any) {
      return ApiResponse.error(res, error.message);
    }
  };

  respondTimeRequest = async (req: any, res: Response) => {
    try {
      const { childId } = req.params;
      const parentId = req.user?.id;
      const { approved, extraMinutes = 30 } = req.body;
      if (typeof approved !== 'boolean') {
        return ApiResponse.error(res, 'approved (boolean) is required', 400);
      }
      const result = await this.childService.respondTimeRequest(
        childId, parentId, approved, Number(extraMinutes),
      );
      return ApiResponse.success(res, result, approved ? 'Time extension granted' : 'Request denied');
    } catch (error: any) {
      return ApiResponse.error(res, error.message);
    }
  };

  getInstalledApps = async (req: any, res: Response) => {
    try {
      const { childId } = req.params;
      const parentId = req.user?.id;
      const apps = await this.childService.getInstalledApps(childId, parentId);
      return ApiResponse.success(res, apps);
    } catch (error: any) {
      return ApiResponse.error(res, error.message);
    }
  };

  getPendingTimeRequest = async (req: any, res: Response) => {
    try {
      const { childId } = req.params;
      const parentId = req.user?.id;
      const request = await this.childService.getPendingTimeRequest(childId, parentId);
      return ApiResponse.success(res, request);
    } catch (error: any) {
      return ApiResponse.error(res, error.message);
    }
  };

  updateChild = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const parentId = req.user?.id;

      const childCheck = await this.childRepo.findOne({
        where: { id, parent: { id: parentId } as any },
      });
      if (!childCheck) return ApiResponse.error(res, 'Unauthorized access to node', 403);

      // Whitelist: only pass safe, parent-controllable fields
      const {
        name, status, dailyLimitMinutes, blockedApps,
        webFilter, geofences, schedules, fcmToken, appUsage,
      } = req.body;

      const safeUpdates: any = {};
      if (name !== undefined) safeUpdates.name = name;
      if (status !== undefined) safeUpdates.status = status;
      if (dailyLimitMinutes !== undefined) safeUpdates.dailyLimitMinutes = dailyLimitMinutes;
      if (blockedApps !== undefined) safeUpdates.blockedApps = blockedApps;
      if (webFilter !== undefined) safeUpdates.webFilter = webFilter;
      if (geofences !== undefined) safeUpdates.geofences = geofences;
      if (schedules !== undefined) safeUpdates.schedules = schedules;
      if (fcmToken !== undefined) safeUpdates.fcmToken = fcmToken;
      if (appUsage !== undefined && Array.isArray(appUsage)) safeUpdates.appUsage = appUsage;

      const result = await this.childService.updateChild(id, safeUpdates);
      return ApiResponse.success(res, result, 'Node policy updated');
    } catch (error: any) {
      return ApiResponse.error(res, error.message);
    }
  };

  getDevicePolicy = async (req: any, res: Response) => {
    try {
      const childId = req.deviceId;
      const policy = await this.childService.getDevicePolicy(childId);
      return ApiResponse.success(res, policy, 'Policy fetched');
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 404);
    }
  };
}
