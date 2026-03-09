
import { AppDataSource } from '../database';
import { ParentEntity } from '../entities/Parent';
import { ChildEntity } from '../entities/Child';
import { AlertEntity } from '../entities/Alert';

type LockReason = 'daily_limit' | 'schedule' | 'manual' | null;

/**
 * Computes the effective (parent-visible) status and the reason for any lock.
 * Priority: daily limit > manual lock > schedule > none.
 */
function computeLockState(child: ChildEntity): { effectiveStatus: string; lockReason: LockReason } {
  if (child.dailyLimitMinutes > 0 && child.usedMinutes >= child.dailyLimitMinutes) {
    return { effectiveStatus: 'paused', lockReason: 'daily_limit' };
  }
  if (child.status === 'paused') {
    return { effectiveStatus: 'paused', lockReason: 'manual' };
  }
  // Schedule check: use server UTC time as approximation (no device timezone stored here).
  // The day/time strings in ScheduleConfig use the device's local time, so this may be
  // off by a timezone offset, but it's still the best available signal for the parent.
  if (isScheduleBlockedNow(child.schedules || [])) {
    return { effectiveStatus: 'paused', lockReason: 'schedule' };
  }
  return { effectiveStatus: child.status, lockReason: null };
}

function isScheduleBlockedNow(schedules: Array<{ day: string; startTime: string; endTime: string; active: boolean }>): boolean {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[now.getDay()];
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const currentTime = `${hh}:${mm}`;
  return schedules.some(s => {
    if (!s.active) return false;
    if (s.day !== 'Everyday' && s.day !== dayName) return false;
    return currentTime >= s.startTime && currentTime < s.endTime;
  });
}

export class ParentService {
  private parentRepo = AppDataSource.getRepository(ParentEntity);
  private childRepo = AppDataSource.getRepository(ChildEntity);
  private alertRepo = AppDataSource.getRepository(AlertEntity);

  async getParentProfile(parentId: string) {
    const parent = await this.parentRepo.findOne({
      where: { id: parentId },
      relations: ['children']
    });
    if (!parent) throw new Error('Parent not found');
    const { passwordHash, failedLoginAttempts, lockedUntil, resetPasswordToken, resetPasswordExpires, ...safeParent } = parent as any;
    return safeParent;
  }

  async getDashboardSummary(parentId: string) {
    const [children] = await this.childRepo.findAndCount({
      where: { parent: { id: parentId } as any },
      take: 50,
    });

    const alerts = await this.alertRepo.find({
      where: { child: { parent: { id: parentId } as any } as any },
      order: { timestamp: 'DESC' } as any,
      take: 20,
    });

    const totalMinutes = children.reduce((acc, c) => acc + (c.usedMinutes || 0), 0);
    const criticalAlerts = alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length;

    return {
      familyStats: {
        totalScreentime: totalMinutes,
        criticalAlerts,
        onlineDevices: children.filter(c => computeLockState(c).effectiveStatus === 'active').length,
        managedNodes: children.length
      },
      children: children.map(c => {
        const { effectiveStatus, lockReason } = computeLockState(c);
        return {
          id: c.id,
          name: c.name,
          status: effectiveStatus,
          lockReason,
          battery: c.battery,
          usedMinutes: c.usedMinutes,
          dailyLimit: c.dailyLimitMinutes,
          dailyLimitMinutes: c.dailyLimitMinutes,
          lastSeen: c.lastSeen,
          location: c.location,
          complianceStatus: c.complianceStatus,
          deviceType: c.deviceType,
          webFilter: c.webFilter,
          appUsage: c.appUsage,
          usageHistory: c.usageHistory,
          blockedApps: c.blockedApps,
          geofences: c.geofences,
          schedules: c.schedules,
          lastInventoryScan: c.lastInventoryScan,
        };
      }),
      recentAlerts: alerts
    };
  }

  async getAlertsPaginated(parentId: string, page = 1, limit = 50) {
    const safeLimit = Math.min(limit, 100);
    const [alerts, total] = await this.alertRepo.findAndCount({
      where: { child: { parent: { id: parentId } as any } as any },
      order: { timestamp: 'DESC' } as any,
      take: safeLimit,
      skip: (page - 1) * safeLimit,
    });
    return { alerts, total, page, limit: safeLimit };
  }

  async updateProfile(parentId: string, updates: Partial<ParentEntity>) {
    const { id, passwordHash, email, failedLoginAttempts, lockedUntil, resetPasswordToken, resetPasswordExpires, ...allowedUpdates } = updates as any;
    await this.parentRepo.update(parentId, allowedUpdates);
    return this.getParentProfile(parentId);
  }
}
