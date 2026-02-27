
import { AppDataSource } from '../database';
import { ParentEntity } from '../entities/Parent';
import { ChildEntity } from '../entities/Child';
import { AlertEntity } from '../entities/Alert';

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
        onlineDevices: children.filter(c => c.status === 'active').length,
        managedNodes: children.length
      },
      children: children.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
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
      })),
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
