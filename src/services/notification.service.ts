import * as admin from 'firebase-admin';
import { AppDataSource } from '../database';
import { ParentEntity } from '../entities/Parent';
import { ChildEntity } from '../entities/Child';
import { NotificationEntity } from '../entities/Notification';
import { subscriptionService } from './subscription.service';

// Initialise Firebase Admin SDK once (idempotent — safe to call multiple times).
// Set FIREBASE_SERVICE_ACCOUNT_JSON env var to the full service account JSON string,
// or set GOOGLE_APPLICATION_CREDENTIALS to the path of the service account JSON file.
function ensureFirebaseInitialised() {
  if (admin.apps.length > 0) return;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[FCM] Firebase Admin SDK initialised from FIREBASE_SERVICE_ACCOUNT_JSON');
    } catch (e) {
      console.error('[FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON — push notifications disabled:', e);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    console.log('[FCM] Firebase Admin SDK initialised via Application Default Credentials');
  } else {
    console.warn('[FCM] No Firebase credentials found. Push notifications will be disabled. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.');
  }
}

export class NotificationService {
  private parentRepo = AppDataSource.getRepository(ParentEntity);
  private childRepo = AppDataSource.getRepository(ChildEntity);
  private notificationRepo = AppDataSource.getRepository(NotificationEntity);

  constructor() {
    ensureFirebaseInitialised();
  }

  async registerToken(userId: string, token: string, userType: 'parent' | 'child', deviceType: 'ios' | 'android') {
    if (userType === 'parent') {
      await this.parentRepo.update(userId, { fcmToken: token, deviceType });
    } else {
      await this.childRepo.update(userId, { fcmToken: token, deviceType });
    }
    return { success: true };
  }

  async persistInApp(recipientId: string, recipientType: 'parent' | 'child', title: string, body: string, data: any = {}) {
    const notification = this.notificationRepo.create({
      recipientId,
      recipientType,
      title,
      body,
      data,
    });
    return await this.notificationRepo.save(notification);
  }

  /** Dispatch an FCM push message. Returns true on success, false on any failure. */
  private async dispatchFcm(
    token: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
    priority: 'normal' | 'high' = 'normal',
  ): Promise<boolean> {
    if (!admin.apps.length) return false;
    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
        data,
        android: {
          priority: priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: priority === 'high' ? 'default' : undefined,
            channelId: priority === 'high' ? 'guardian_alerts_critical' : 'guardian_alerts',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: priority === 'high' ? 'default' : undefined,
              contentAvailable: true,
            },
          },
          headers: {
            'apns-priority': priority === 'high' ? '10' : '5',
          },
        },
      });
      return true;
    } catch (err: any) {
      if (
        err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token'
      ) {
        console.warn('[FCM] Stale token detected — will clear from DB');
      } else {
        console.error('[FCM] Send error:', err.message);
      }
      return false;
    }
  }

  async sendToParent(parentId: string, title: string, body: string, data: any = {}) {
    const parent = await this.parentRepo.findOne({ where: { id: parentId } });
    if (!parent) return;

    // Always persist in-app notification regardless of plan
    await this.persistInApp(parentId, 'parent', title, body, data);

    // Real-time push requires Premium or higher.
    // Basic plan parents can still see notifications in the app — just no push.
    // TIME_REQUEST is treated as critical so parents on all plans receive it immediately
    const isCritical = ['SOS', 'OFFLINE', 'TAMPERED', 'TIME_REQUEST'].includes(data.type);
    const { allowed: pushAllowed } = await subscriptionService.checkLimit(parentId, 'realTimeAlerts');
    if (!pushAllowed && !isCritical) {
      // SOS/offline/tamper alerts bypass the gate — always push regardless of plan
      return;
    }

    if (parent.fcmToken) {
      const sent = await this.dispatchFcm(
        parent.fcmToken,
        title,
        body,
        {
          type: String(data.type || ''),
          childId: String(data.childId || ''),
        },
        isCritical ? 'high' : 'normal',
      );

      if (!sent) {
        // Clear invalid token so we stop retrying on every heartbeat
        await this.parentRepo.update(parentId, { fcmToken: null } as any);
      }
    }
  }

  async sendToChild(childId: string, title: string, body: string, data: any = {}) {
    const child = await this.childRepo.findOne({ where: { id: childId } });
    if (!child) return;

    if (data.type !== 'SILENT_COMMAND') {
      await this.persistInApp(childId, 'child', title, body, data);
    }

    if (child.fcmToken) {
      const isCritical = ['LOCK', 'PLAY_SIREN'].includes(data.type);
      const sent = await this.dispatchFcm(
        child.fcmToken,
        title,
        body,
        { type: String(data.type || ''), childId },
        isCritical ? 'high' : 'normal',
      );

      if (!sent) {
        await this.childRepo.update(childId, { fcmToken: null } as any);
      }
    }
  }

  async getNotifications(userId: string) {
    return await this.notificationRepo.find({
      where: { recipientId: userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, recipientId: string) {
    // recipientId enforces ownership — only updates the row if it belongs to this parent
    await this.notificationRepo.update(
      { id: notificationId, recipientId },
      { isRead: true },
    );
  }
}
