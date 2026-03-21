"use strict";
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
exports.AlertService = void 0;
const database_1 = require("../database");
const Alert_1 = require("../entities/Alert");
const AuditLog_1 = require("../entities/AuditLog");
const notification_service_1 = require("./notification.service");
const Child_1 = require("../entities/Child");
const email_service_1 = require("./email.service");
const sms_service_1 = require("./sms.service");
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
];
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
function looksLikeSocialPackage(pkg) {
    const lower = pkg.toLowerCase();
    const SOCIAL_KEYWORDS = ['social', 'chat', 'messenger', 'dating', 'meet', 'friends', 'talk', 'dm'];
    return SOCIAL_KEYWORDS.some((kw) => lower.includes(kw));
}
class AlertService {
    constructor() {
        this.alertRepo = database_1.AppDataSource.getRepository(Alert_1.AlertEntity);
        this.logRepo = database_1.AppDataSource.getRepository(AuditLog_1.AuditLogEntity);
        this.childRepo = database_1.AppDataSource.getRepository(Child_1.ChildEntity);
        this.notificationService = new notification_service_1.NotificationService();
    }
    getAllAlerts(parentId_1) {
        return __awaiter(this, arguments, void 0, function* (parentId, page = 1, limit = 50) {
            const safeLimit = Math.min(limit, 100);
            const [alerts, total] = yield this.alertRepo.findAndCount({
                where: { child: { parent: { id: parentId } } },
                relations: ['child'],
                order: { timestamp: 'DESC' },
                take: safeLimit,
                skip: (page - 1) * safeLimit,
            });
            return { alerts, total, page, limit: safeLimit };
        });
    }
    getLogsByChildId(childId_1, parentId_1) {
        return __awaiter(this, arguments, void 0, function* (childId, parentId, page = 1, limit = 100, actionType) {
            // Verify this child belongs to the requesting parent
            const child = yield this.childRepo.findOne({
                where: { id: childId, parent: { id: parentId } },
            });
            if (!child)
                throw new Error('Child not found or access denied');
            const safeLimit = Math.min(limit, 500);
            const where = { childId };
            if (actionType && VALID_ACTION_TYPES.includes(actionType)) {
                where.actionType = actionType;
            }
            const [logs, total] = yield this.logRepo.findAndCount({
                where,
                order: { timestamp: 'DESC' },
                take: safeLimit,
                skip: (page - 1) * safeLimit,
            });
            return { logs, total, page, limit: safeLimit };
        });
    }
    createLog(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            // Validate actionType against enum
            if (!data.actionType || !VALID_ACTION_TYPES.includes(data.actionType)) {
                console.warn(`[AlertService] Rejected log with invalid actionType: ${data.actionType}`);
                return null;
            }
            // Sanitize details
            if (!data.details || typeof data.details !== 'string') {
                data.details = 'No details provided';
            }
            else if (data.details.length > 2000) {
                data.details = data.details.substring(0, 2000);
            }
            // Server-side dedup for NOTIFICATION_RECEIVED: drop if the same child sent
            // the identical details string within the last 60 seconds. This catches
            // bursts that slip through the device-side 3s debounce (e.g. WhatsApp group
            // chats firing rapid-fire notifications with the same summary text).
            if (data.actionType === 'NOTIFICATION_RECEIVED' && data.details && data.childId) {
                const sixtySecondsAgo = new Date(Date.now() - 60000);
                const duplicate = yield this.logRepo.findOne({
                    where: { childId: data.childId, actionType: 'NOTIFICATION_RECEIVED', details: data.details },
                    order: { timestamp: 'DESC' },
                });
                if (duplicate && duplicate.timestamp > sixtySecondsAgo) {
                    return null;
                }
            }
            // Verify child exists and is enrolled
            const child = yield this.childRepo.findOne({
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
                !isNaN(+clientTime) && Math.abs(Date.now() - +clientTime) < 86400000
                    ? clientTime
                    : new Date();
            const log = this.logRepo.create(data);
            const savedLog = yield this.logRepo.save(log);
            // ── Time request: child is asking for more screen time ───────────────────
            if (data.actionType === 'UNLOCK_REQUEST') {
                // Deduplicate: only one pending request at a time per child
                const existingRequest = yield this.alertRepo.findOne({
                    where: { childId: data.childId, type: 'time_request', isResolved: false },
                });
                if (!existingRequest) {
                    const timeAlert = this.alertRepo.create({
                        childId: data.childId,
                        type: 'time_request',
                        message: `${child.name} is requesting more screen time.`,
                        severity: 'warning',
                    });
                    yield this.alertRepo.save(timeAlert);
                    if (child.parent) {
                        // High-priority push so the parent sees it immediately
                        yield this.notificationService.sendToParent(child.parent.id, `⏰ Time Request from ${child.name}`, `${child.name} is asking for more screen time. Open the app to approve or deny.`, { type: 'TIME_REQUEST', childId: child.id, alertId: timeAlert.id });
                    }
                }
                else {
                    console.log(`[AlertService] Duplicate time request from ${data.childId} — ignoring`);
                }
            }
            // ── Geofence alerts ──────────────────────────────────────────────────────
            if (data.actionType === 'GEOFENCE_ENTER' || data.actionType === 'GEOFENCE_EXIT') {
                const alertType = data.actionType === 'GEOFENCE_ENTER' ? 'geofence_entry' : 'geofence_exit';
                const geofenceAlert = this.alertRepo.create({
                    childId: data.childId,
                    type: alertType,
                    message: data.details,
                    severity: 'info',
                    metadata: data.metadata,
                });
                yield this.alertRepo.save(geofenceAlert);
                if (child.parent) {
                    yield this.notificationService.sendToParent(child.parent.id, `📍 ${child.name}`, data.details, { type: 'GEOFENCE', childId: child.id, alertId: geofenceAlert.id });
                }
            }
            // ── Timed geofence violation alerts ─────────────────────────────────────
            if (data.actionType === 'GEOFENCE_OVERDUE' || data.actionType === 'GEOFENCE_MISSING') {
                const timedAlert = this.alertRepo.create({
                    childId: data.childId,
                    type: 'geofence_timed',
                    message: data.details,
                    severity: 'warning',
                    metadata: data.metadata,
                });
                yield this.alertRepo.save(timedAlert);
                if (child.parent) {
                    yield this.notificationService.sendToParent(child.parent.id, `⏰ ${child.name}`, data.details, { type: 'GEOFENCE_TIMED', childId: child.id, alertId: timedAlert.id });
                }
            }
            // ── New app install alert ────────────────────────────────────────────────
            if (data.actionType === 'APP_INSTALLED') {
                const appName = ((_a = data.metadata) === null || _a === void 0 ? void 0 : _a.appName) || ((_b = data.details) === null || _b === void 0 ? void 0 : _b.split(' (')[0]) || 'Unknown app';
                const packageName = ((_c = data.metadata) === null || _c === void 0 ? void 0 : _c.packageName) || '';
                const appAlert = this.alertRepo.create({
                    childId: data.childId,
                    type: 'new_app',
                    message: `${child.name} installed ${appName}`,
                    severity: 'info',
                    metadata: { appName, packageName },
                });
                yield this.alertRepo.save(appAlert);
                if (child.parent) {
                    yield this.notificationService.sendToParent(child.parent.id, `📲 New app on ${child.name}'s device`, `${child.name} installed ${appName}`, { type: 'APP_INSTALLED', childId: child.id, alertId: appAlert.id });
                }
            }
            // ── Social media / messaging notification flagging ───────────────────────
            // If a notification from a known social/messaging app is captured, create a parent alert.
            if (data.actionType === 'NOTIFICATION_RECEIVED' && ((_d = data.metadata) === null || _d === void 0 ? void 0 : _d.appPackage)) {
                const pkg = data.metadata.appPackage;
                if (FLAGGED_NOTIFICATION_PACKAGES.has(pkg) || looksLikeSocialPackage(pkg)) {
                    const existing = yield this.alertRepo.findOne({
                        where: { childId: data.childId, type: 'unsafe_content', isResolved: false, message: data.details },
                    });
                    if (!existing && child.parent) {
                        const notifAlert = this.alertRepo.create({
                            childId: data.childId,
                            type: 'unsafe_content',
                            message: data.details,
                            severity: 'info',
                            metadata: data.metadata,
                        });
                        yield this.alertRepo.save(notifAlert);
                        yield this.notificationService.sendToParent(child.parent.id, `Message activity: ${child.name}`, data.details, { type: 'NOTIFICATION', childId: child.id, alertId: notifAlert.id });
                    }
                }
            }
            // ── Auto-alert for critical safety events ───────────────────────────────
            if (data.actionType === 'WEB_BLOCKED' ||
                data.actionType === 'APP_BLOCKED' ||
                data.isFlagged ||
                data.actionType === 'TAMPER_DETECTED' ||
                data.actionType === 'SOS_PANIC') {
                let alertType = 'unsafe_content';
                let severity = 'high';
                if (data.actionType === 'APP_BLOCKED') {
                    alertType = 'policy_violation';
                    severity = 'high';
                }
                if (data.actionType === 'TAMPER_DETECTED') {
                    alertType = 'device_tampered';
                }
                if (data.actionType === 'SOS_PANIC') {
                    alertType = 'sos_emergency';
                    severity = 'critical';
                }
                const alert = this.alertRepo.create({
                    childId: data.childId,
                    type: alertType,
                    message: data.details,
                    severity,
                });
                yield this.alertRepo.save(alert);
                if (child.parent) {
                    yield this.notificationService.sendToParent(child.parent.id, `Safety Alert: ${child.name}`, data.details, { type: data.actionType === 'SOS_PANIC' ? 'SOS_PANIC' : 'alert', alertId: alert.id, childId: child.id });
                    // SOS: fire email + SMS in parallel (non-blocking)
                    if (data.actionType === 'SOS_PANIC') {
                        const loc = ((_e = data.metadata) === null || _e === void 0 ? void 0 : _e.lat) && ((_f = data.metadata) === null || _f === void 0 ? void 0 : _f.lng)
                            ? { lat: Number(data.metadata.lat), lng: Number(data.metadata.lng) }
                            : null;
                        const ts = data.timestamp instanceof Date ? data.timestamp : new Date();
                        email_service_1.emailService.sendSosAlert(child.parent.email, child.parent.name, child.name, loc, ts).catch(() => { });
                        if (child.parent.phone) {
                            sms_service_1.smsService.sendSosAlert(child.parent.phone, child.name, loc).catch(() => { });
                        }
                    }
                }
            }
            return savedLog;
        });
    }
}
exports.AlertService = AlertService;
//# sourceMappingURL=alert.service.js.map