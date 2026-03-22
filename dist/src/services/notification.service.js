"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const admin = __importStar(require("firebase-admin"));
const database_1 = require("../database");
const Parent_1 = require("../entities/Parent");
const Child_1 = require("../entities/Child");
const Notification_1 = require("../entities/Notification");
const subscription_service_1 = require("./subscription.service");
// Initialise Firebase Admin SDK once (idempotent — safe to call multiple times).
// Set FIREBASE_SERVICE_ACCOUNT_JSON env var to the full service account JSON string,
// or set GOOGLE_APPLICATION_CREDENTIALS to the path of the service account JSON file.
function ensureFirebaseInitialised() {
    if (admin.apps.length > 0)
        return;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
        try {
            const serviceAccount = JSON.parse(serviceAccountJson);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('[FCM] Firebase Admin SDK initialised from FIREBASE_SERVICE_ACCOUNT_JSON');
        }
        catch (e) {
            console.error('[FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON — push notifications disabled:', e);
        }
    }
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ credential: admin.credential.applicationDefault() });
        console.log('[FCM] Firebase Admin SDK initialised via Application Default Credentials');
    }
    else {
        console.warn('[FCM] No Firebase credentials found. Push notifications will be disabled. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.');
    }
}
class NotificationService {
    constructor() {
        this.parentRepo = database_1.AppDataSource.getRepository(Parent_1.ParentEntity);
        this.childRepo = database_1.AppDataSource.getRepository(Child_1.ChildEntity);
        this.notificationRepo = database_1.AppDataSource.getRepository(Notification_1.NotificationEntity);
        ensureFirebaseInitialised();
    }
    registerToken(userId, token, userType, deviceType) {
        return __awaiter(this, void 0, void 0, function* () {
            if (userType === 'parent') {
                yield this.parentRepo.update(userId, { fcmToken: token, deviceType });
            }
            else {
                yield this.childRepo.update(userId, { fcmToken: token, deviceType });
            }
            return { success: true };
        });
    }
    persistInApp(recipientId_1, recipientType_1, title_1, body_1) {
        return __awaiter(this, arguments, void 0, function* (recipientId, recipientType, title, body, data = {}) {
            const notification = this.notificationRepo.create({
                recipientId,
                recipientType,
                title,
                body,
                data,
            });
            return yield this.notificationRepo.save(notification);
        });
    }
    /** Dispatch an FCM push message. Returns true on success, false on any failure. */
    dispatchFcm(token_1, title_1, body_1) {
        return __awaiter(this, arguments, void 0, function* (token, title, body, data = {}, priority = 'normal') {
            if (!admin.apps.length)
                return false;
            try {
                yield admin.messaging().send({
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
            }
            catch (err) {
                if (err.code === 'messaging/registration-token-not-registered' ||
                    err.code === 'messaging/invalid-registration-token') {
                    console.warn('[FCM] Stale token detected — will clear from DB');
                }
                else {
                    console.error('[FCM] Send error:', err.message);
                }
                return false;
            }
        });
    }
    sendToParent(parentId_1, title_1, body_1) {
        return __awaiter(this, arguments, void 0, function* (parentId, title, body, data = {}) {
            const parent = yield this.parentRepo.findOne({ where: { id: parentId } });
            if (!parent)
                return;
            // Always persist in-app notification regardless of plan
            yield this.persistInApp(parentId, 'parent', title, body, data);
            // Real-time push requires Premium or higher.
            // Basic plan parents can still see notifications in the app — just no push.
            // TIME_REQUEST is treated as critical so parents on all plans receive it immediately
            const isCritical = ['SOS', 'OFFLINE', 'TAMPERED', 'TIME_REQUEST'].includes(data.type);
            const { allowed: pushAllowed } = yield subscription_service_1.subscriptionService.checkLimit(parentId, 'realTimeAlerts');
            if (!pushAllowed && !isCritical) {
                // SOS/offline/tamper alerts bypass the gate — always push regardless of plan
                return;
            }
            if (parent.fcmToken) {
                const sent = yield this.dispatchFcm(parent.fcmToken, title, body, {
                    type: String(data.type || ''),
                    childId: String(data.childId || ''),
                }, isCritical ? 'high' : 'normal');
                if (!sent) {
                    // Clear invalid token so we stop retrying on every heartbeat
                    yield this.parentRepo.update(parentId, { fcmToken: null });
                }
            }
        });
    }
    sendToChild(childId_1, title_1, body_1) {
        return __awaiter(this, arguments, void 0, function* (childId, title, body, data = {}) {
            const child = yield this.childRepo.findOne({ where: { id: childId } });
            if (!child)
                return;
            if (data.type !== 'SILENT_COMMAND') {
                yield this.persistInApp(childId, 'child', title, body, data);
            }
            if (child.fcmToken) {
                const isCritical = ['LOCK', 'PLAY_SIREN'].includes(data.type);
                const sent = yield this.dispatchFcm(child.fcmToken, title, body, { type: String(data.type || ''), childId }, isCritical ? 'high' : 'normal');
                if (!sent) {
                    yield this.childRepo.update(childId, { fcmToken: null });
                }
            }
        });
    }
    getNotifications(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.notificationRepo.find({
                where: { recipientId: userId },
                order: { createdAt: 'DESC' },
                take: 50,
            });
        });
    }
    markAsRead(notificationId, recipientId) {
        return __awaiter(this, void 0, void 0, function* () {
            // recipientId enforces ownership — only updates the row if it belongs to this parent
            yield this.notificationRepo.update({ id: notificationId, recipientId }, { isRead: true });
        });
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.service.js.map