import { AppDataSource } from '../database';
import { AlertEntity } from '../entities/Alert';
import { AuditLogEntity } from '../entities/AuditLog';
import { NotificationService } from './notification.service';
import { ChildEntity } from '../entities/Child';

const VALID_ACTION_TYPES = [
  'APP_OPEN', 'APP_CLOSE', 'APP_BLOCKED', 'WEB_VISIT', 'WEB_BLOCKED',
  'GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'GEOFENCE_DWELL', 'LIMIT_REACHED',
  'LIMIT_WARNING', 'DEVICE_LOCK', 'DEVICE_UNLOCK', 'HEARTBEAT',
  'INVENTORY_SCAN', 'POLICY_SYNC', 'COMMAND_EXECUTED', 'LOCATION_UPDATE',
  'BATTERY_UPDATE', 'TAMPER_DETECTED', 'SETTING_CHANGED', 'VPN_STATUS',
  'SOS_PANIC', 'UNLOCK_REQUEST',
] as const;

export class AlertService {
  private alertRepo = AppDataSource.getRepository(AlertEntity);
  private logRepo = AppDataSource.getRepository(AuditLogEntity);
  private childRepo = AppDataSource.getRepository(ChildEntity);
  private notificationService = new NotificationService();

  async getAllAlerts(parentId: string, page = 1, limit = 50) {
    const safeLimit = Math.min(limit, 100);
    const [alerts, total] = await this.alertRepo.findAndCount({
      where: { child: { parent: { id: parentId } as any } as any },
      relations: ['child'],
      order: { timestamp: 'DESC' },
      take: safeLimit,
      skip: (page - 1) * safeLimit,
    });
    return { alerts, total, page, limit: safeLimit };
  }

  async getLogsByChildId(childId: string, parentId: string, page = 1, limit = 100) {
    // Verify this child belongs to the requesting parent
    const child = await this.childRepo.findOne({
      where: { id: childId, parent: { id: parentId } as any },
    });
    if (!child) throw new Error('Child not found or access denied');

    const safeLimit = Math.min(limit, 500);
    const [logs, total] = await this.logRepo.findAndCount({
      where: { childId },
      order: { timestamp: 'DESC' },
      take: safeLimit,
      skip: (page - 1) * safeLimit,
    });
    return { logs, total, page, limit: safeLimit };
  }

  async createLog(data: any) {
    // Validate actionType against enum
    if (!data.actionType || !(VALID_ACTION_TYPES as readonly string[]).includes(data.actionType)) {
      console.warn(`[AlertService] Rejected log with invalid actionType: ${data.actionType}`);
      return null;
    }

    // Sanitize details
    if (!data.details || typeof data.details !== 'string') {
      data.details = 'No details provided';
    } else if (data.details.length > 2000) {
      data.details = data.details.substring(0, 2000);
    }

    // Verify child exists and is enrolled
    const child = await this.childRepo.findOne({
      where: { id: data.childId },
      relations: ['parent'],
    });

    if (!child || !child.isEnrolled) {
      console.warn(`[AlertService] Log rejected: Device ${data.childId} not enrolled.`);
      return null;
    }

    const log = this.logRepo.create(data);
    const savedLog = await this.logRepo.save(log);

    // ── Time request: child is asking for more screen time ───────────────────
    if (data.actionType === 'UNLOCK_REQUEST') {
      // Deduplicate: only one pending request at a time per child
      const existingRequest = await this.alertRepo.findOne({
        where: { childId: data.childId, type: 'time_request' as any, isResolved: false },
      });
      if (!existingRequest) {
        const timeAlert = this.alertRepo.create({
          childId: data.childId,
          type: 'time_request' as any,
          message: `${child.name} is requesting more screen time.`,
          severity: 'warning',
        });
        await this.alertRepo.save(timeAlert);

        if (child.parent) {
          // High-priority push so the parent sees it immediately
          await this.notificationService.sendToParent(
            child.parent.id,
            `⏰ Time Request from ${child.name}`,
            `${child.name} is asking for more screen time. Open the app to approve or deny.`,
            { type: 'TIME_REQUEST', childId: child.id, alertId: timeAlert.id },
          );
        }
      } else {
        console.log(`[AlertService] Duplicate time request from ${data.childId} — ignoring`);
      }
    }

    // ── Geofence alerts ──────────────────────────────────────────────────────
    // Route by actionType so geofence events never fall into the unsafe_content
    // catch-all below. DWELL is audit-only (no parent alert needed).
    if (data.actionType === 'GEOFENCE_ENTER' || data.actionType === 'GEOFENCE_EXIT') {
      const alertType = data.actionType === 'GEOFENCE_ENTER' ? 'geofence_entry' : 'geofence_exit';
      const geofenceAlert = this.alertRepo.create({
        childId: data.childId,
        type: alertType as any,
        message: data.details,
        severity: 'info',
        metadata: data.metadata,
      });
      await this.alertRepo.save(geofenceAlert);
      if (child.parent) {
        await this.notificationService.sendToParent(
          child.parent.id,
          `📍 ${child.name}`,
          data.details,
          { type: 'GEOFENCE', childId: child.id, alertId: geofenceAlert.id },
        );
      }
    }

    // ── Auto-alert for critical safety events ───────────────────────────────
    if (
      data.actionType === 'WEB_BLOCKED' ||
      data.actionType === 'APP_BLOCKED' ||
      data.isFlagged ||
      data.actionType === 'TAMPER_DETECTED' ||
      data.actionType === 'SOS_PANIC'
    ) {
      let alertType = 'unsafe_content';
      let severity: 'high' | 'critical' = 'high';
      if (data.actionType === 'APP_BLOCKED') { alertType = 'policy_violation'; severity = 'high'; }
      if (data.actionType === 'TAMPER_DETECTED') { alertType = 'device_tampered'; }
      if (data.actionType === 'SOS_PANIC') { alertType = 'sos_emergency'; severity = 'critical'; }

      const alert = this.alertRepo.create({
        childId: data.childId,
        type: alertType,
        message: data.details,
        severity,
      });
      await this.alertRepo.save(alert);

      if (child.parent) {
        await this.notificationService.sendToParent(
          child.parent.id,
          `Safety Alert: ${child.name}`,
          data.details,
          { type: 'alert', alertId: alert.id, childId: child.id }
        );
      }
    }

    return savedLog;
  }
}
