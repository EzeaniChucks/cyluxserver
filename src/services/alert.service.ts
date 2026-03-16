import { AppDataSource } from '../database';
import { AlertEntity } from '../entities/Alert';
import { AuditLogEntity } from '../entities/AuditLog';
import { NotificationService } from './notification.service';
import { ChildEntity } from '../entities/Child';
import { emailService } from './email.service';
import { smsService } from './sms.service';

const VALID_ACTION_TYPES = [
  'APP_OPEN', 'APP_CLOSE', 'APP_BLOCKED', 'WEB_VISIT', 'WEB_BLOCKED',
  'GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'GEOFENCE_DWELL', 'LIMIT_REACHED',
  'LIMIT_WARNING', 'DEVICE_LOCK', 'DEVICE_UNLOCK', 'HEARTBEAT',
  'INVENTORY_SCAN', 'POLICY_SYNC', 'COMMAND_EXECUTED', 'LOCATION_UPDATE',
  'BATTERY_UPDATE', 'TAMPER_DETECTED', 'SETTING_CHANGED', 'VPN_STATUS',
  'SOS_PANIC', 'UNLOCK_REQUEST',
  'YOUTUBE_WATCH', 'YOUTUBE_SEARCH', 'NOTIFICATION_RECEIVED',
  'CALL_LOG', 'SMS_RECEIVED', 'WEB_HISTORY',
  'SOCIAL_CONTENT',
  'GEOFENCE_OVERDUE', 'GEOFENCE_MISSING',
  'APP_INSTALLED',
] as const;

// Social/messaging app packages whose notifications are flagged for parents.
// Covers major global platforms + regional apps. Unknown apps are caught by
// the fuzzy keyword matcher below.
const FLAGGED_NOTIFICATION_PACKAGES = new Set([
  // WhatsApp
  'com.whatsapp', 'com.whatsapp.w4b',
  // Instagram
  'com.instagram.android',
  // Facebook / Messenger
  'com.facebook.katana', 'com.facebook.lite', 'com.facebook.orca',
  // Snapchat
  'com.snapchat.android',
  // TikTok (two known package names)
  'com.zhiliaoapp.musically', 'com.ss.android.ugc.aweme',
  // Discord
  'com.discord',
  // Telegram
  'org.telegram.messenger', 'org.telegram.messenger.beta', 'org.telegram.plus',
  // Twitter / X
  'com.twitter.android', 'com.twitter.android.lite', 'com.x.android',
  // WeChat / QQ / Weibo (China)
  'com.tencent.mm', 'com.tencent.mobileqq', 'com.sina.weibo',
  // LINE (Japan/Asia)
  'jp.naver.line.android',
  // KakaoTalk (Korea)
  'com.kakao.talk',
  // Zalo (Vietnam)
  'com.zing.zalo',
  // VK (Russia/Europe)
  'com.vkontakte.android',
  // Viber / Skype
  'com.viber.voip', 'com.skype.raider',
  // BeReal / Twitch
  'com.bereal.ft', 'tv.twitch.android.app',
  // Reddit / LinkedIn / Pinterest / Tumblr
  'com.reddit.frontpage', 'com.linkedin.android', 'com.pinterest', 'com.tumblr',
  // Teen-focused: Kik, Yubo, BIGO Live, Likee
  'com.kik.android', 'com.SquareDaisy.Yubo', 'sg.bigo.live', 'video.like',
  // Signal (private messaging)
  'org.thoughtcrime.securesms',
  // Clubhouse
  'com.clubhouse.app',
  // MiChat / Helo
  'com.bimilive.michat', 'com.helo.android',
]);

// Fuzzy keyword classifier: catches niche/regional/unknown social apps not in
// the hardcoded list. Used as a fallback when the package is not explicitly listed.
function looksLikeSocialPackage(pkg: string): boolean {
  const lower = pkg.toLowerCase();
  const SOCIAL_KEYWORDS = ['social', 'chat', 'messenger', 'dating', 'meet', 'friends', 'talk', 'dm'];
  return SOCIAL_KEYWORDS.some((kw) => lower.includes(kw));
}

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

  async getLogsByChildId(
    childId: string,
    parentId: string,
    page = 1,
    limit = 100,
    actionType?: string,
  ) {
    // Verify this child belongs to the requesting parent
    const child = await this.childRepo.findOne({
      where: { id: childId, parent: { id: parentId } as any },
    });
    if (!child) throw new Error('Child not found or access denied');

    const safeLimit = Math.min(limit, 500);

    const where: any = { childId };
    if (actionType && (VALID_ACTION_TYPES as readonly string[]).includes(actionType)) {
      where.actionType = actionType;
    }

    const [logs, total] = await this.logRepo.findAndCount({
      where,
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

    // Use the client-provided timestamp if it's a valid ISO date within a 24h window.
    // Falls back to server time for missing, malformed, or out-of-range values.
    const clientTime = data.timestamp ? new Date(data.timestamp) : NaN;
    data.timestamp =
      !isNaN(+clientTime) && Math.abs(Date.now() - +clientTime) < 86_400_000
        ? clientTime
        : new Date();

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

    // ── Timed geofence violation alerts ─────────────────────────────────────
    if (data.actionType === 'GEOFENCE_OVERDUE' || data.actionType === 'GEOFENCE_MISSING') {
      const timedAlert = this.alertRepo.create({
        childId: data.childId,
        type: 'geofence_timed' as any,
        message: data.details,
        severity: 'warning',
        metadata: data.metadata,
      });
      await this.alertRepo.save(timedAlert);
      if (child.parent) {
        await this.notificationService.sendToParent(
          child.parent.id,
          `⏰ ${child.name}`,
          data.details,
          { type: 'GEOFENCE_TIMED', childId: child.id, alertId: timedAlert.id },
        );
      }
    }

    // ── New app install alert ────────────────────────────────────────────────
    if (data.actionType === 'APP_INSTALLED') {
      const appName = data.metadata?.appName || data.details?.split(' (')[0] || 'Unknown app';
      const packageName = data.metadata?.packageName || '';

      const appAlert = this.alertRepo.create({
        childId: data.childId,
        type: 'new_app' as any,
        message: `${child.name} installed ${appName}`,
        severity: 'info',
        metadata: { appName, packageName },
      });
      await this.alertRepo.save(appAlert);

      if (child.parent) {
        await this.notificationService.sendToParent(
          child.parent.id,
          `📲 New app on ${child.name}'s device`,
          `${child.name} installed ${appName}`,
          { type: 'APP_INSTALLED', childId: child.id, alertId: appAlert.id },
        );
      }
    }

    // ── Social media / messaging notification flagging ───────────────────────
    // If a notification from a known social/messaging app is captured, create a parent alert.
    if (data.actionType === 'NOTIFICATION_RECEIVED' && data.metadata?.appPackage) {
      const pkg: string = data.metadata.appPackage;
    if (FLAGGED_NOTIFICATION_PACKAGES.has(pkg) || looksLikeSocialPackage(pkg)) {
        const existing = await this.alertRepo.findOne({
          where: { childId: data.childId, type: 'unsafe_content' as any, isResolved: false, message: data.details },
        });
        if (!existing && child.parent) {
          const notifAlert = this.alertRepo.create({
            childId: data.childId,
            type: 'unsafe_content' as any,
            message: data.details,
            severity: 'info',
            metadata: data.metadata,
          });
          await this.alertRepo.save(notifAlert);
          await this.notificationService.sendToParent(
            child.parent.id,
            `Message activity: ${child.name}`,
            data.details,
            { type: 'NOTIFICATION', childId: child.id, alertId: notifAlert.id },
          );
        }
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
          { type: data.actionType === 'SOS_PANIC' ? 'SOS_PANIC' : 'alert', alertId: alert.id, childId: child.id }
        );

        // SOS: fire email + SMS in parallel (non-blocking)
        if (data.actionType === 'SOS_PANIC') {
          const loc = data.metadata?.lat && data.metadata?.lng
            ? { lat: Number(data.metadata.lat), lng: Number(data.metadata.lng) }
            : null;
          const ts = data.timestamp instanceof Date ? data.timestamp : new Date();
          emailService.sendSosAlert(child.parent.email, child.parent.name, child.name, loc, ts).catch(() => {});
          if (child.parent.phone) {
            smsService.sendSosAlert(child.parent.phone, child.name, loc).catch(() => {});
          }
        }
      }
    }

    return savedLog;
  }
}
