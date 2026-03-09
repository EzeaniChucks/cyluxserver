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
exports.ChildService = void 0;
const database_1 = require("../database");
const Child_1 = require("../entities/Child");
const Command_1 = require("../entities/Command");
const AuditLog_1 = require("../entities/AuditLog");
const Alert_1 = require("../entities/Alert");
const Reward_1 = require("../entities/Reward");
const notification_service_1 = require("./notification.service");
const smartDevice_service_1 = require("./smartDevice.service");
const typeorm_1 = require("typeorm");
const alert_service_1 = require("./alert.service");
const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const alertRepo = () => database_1.AppDataSource.getRepository(Alert_1.AlertEntity);
const ALLOWED_COMMAND_TYPES = [
    "LOCK",
    "UNLOCK",
    "PLAY_SIREN",
    "SYNC_POLICY",
    "WIPE_BROWSER",
    "REMOTE_WIPE",
    "REBOOT",
    "INVENTORY_SCAN",
];
class ChildService {
    constructor() {
        this.childRepo = database_1.AppDataSource.getRepository(Child_1.ChildEntity);
        this.commandRepo = database_1.AppDataSource.getRepository(Command_1.CommandEntity);
        this.logRepo = database_1.AppDataSource.getRepository(AuditLog_1.AuditLogEntity);
        this.notificationService = new notification_service_1.NotificationService();
    }
    processHeartbeat(childId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const result = yield database_1.AppDataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const childRepo = manager.getRepository(Child_1.ChildEntity);
                const logRepo = manager.getRepository(AuditLog_1.AuditLogEntity);
                const alertRepo = manager.getRepository(Alert_1.AlertEntity);
                // Acquire row-level lock to prevent race conditions on concurrent heartbeats.
                // Lock is scoped to "child" only — PostgreSQL forbids FOR UPDATE on the nullable
                // side of an outer join, so the parent relation is loaded without a lock.
                const child = yield childRepo
                    .createQueryBuilder("child")
                    .setLock("pessimistic_write", undefined, ["child"])
                    .leftJoinAndSelect("child.parent", "parent")
                    .where("child.id = :id", { id: childId })
                    .getOne();
                if (!child)
                    throw new Error("Managed Node not found");
                const now = new Date();
                // Deduplicate: ignore heartbeats within 5 seconds of the last one
                if (child.lastSeen && now.getTime() - new Date(child.lastSeen).getTime() < 5000) {
                    const commands = yield this.commandRepo.find({
                        where: { childId, status: "pending" },
                        order: { createdAt: "ASC" },
                    });
                    const rewardRepo = manager.getRepository(Reward_1.RewardEntity);
                    const pendingRewards = yield rewardRepo.find({ where: { childId, claimed: false } });
                    const pendingRewardMinutes = pendingRewards.reduce((sum, r) => sum + r.minutes, 0);
                    const dedupEffectiveStatus = child.dailyLimitMinutes > 0 && child.usedMinutes >= child.dailyLimitMinutes
                        ? "paused"
                        : child.status;
                    const dedupLockReason = child.dailyLimitMinutes > 0 && child.usedMinutes >= child.dailyLimitMinutes
                        ? "daily_limit"
                        : child.status === "paused" ? "manual" : null;
                    return {
                        policyVersion: now.getTime(),
                        policy: {
                            id: child.id,
                            status: dedupEffectiveStatus,
                            lockReason: dedupLockReason,
                            webFilter: child.webFilter,
                            dailyLimit: child.dailyLimitMinutes,
                            dailyLimitMinutes: child.dailyLimitMinutes,
                            usedMinutes: child.usedMinutes,
                            blockedApps: child.blockedApps,
                            geofences: child.geofences,
                            schedules: child.schedules,
                            pendingRewardMinutes,
                        },
                        commands: commands.map((c) => ({ id: c.id, type: c.type, payload: c.payload })),
                    };
                }
                // --- Input bounds validation (silently ignore out-of-range values) ---
                let validatedBattery = child.battery;
                if (typeof data.battery === "number" &&
                    isFinite(data.battery) &&
                    data.battery >= 0 &&
                    data.battery <= 100) {
                    validatedBattery = Math.round(data.battery);
                }
                let validatedLocation = child.location;
                if (data.location &&
                    typeof data.location.lat === "number" &&
                    typeof data.location.lng === "number" &&
                    isFinite(data.location.lat) &&
                    isFinite(data.location.lng) &&
                    data.location.lat >= -90 &&
                    data.location.lat <= 90 &&
                    data.location.lng >= -180 &&
                    data.location.lng <= 180 &&
                    // Reject (0, 0) "Null Island" — sent as placeholder when no GPS fix is available.
                    // Accepting it would overwrite the last known position and bloat locationHistory.
                    (data.location.lat !== 0 || data.location.lng !== 0)) {
                    validatedLocation = { lat: data.location.lat, lng: data.location.lng };
                }
                let usedMinutes = child.usedMinutes;
                if (typeof data.totalUsedMinutes === "number" &&
                    isFinite(data.totalUsedMinutes) &&
                    data.totalUsedMinutes >= 0) {
                    usedMinutes = data.totalUsedMinutes;
                }
                // --- Daily reset (within the transaction lock) ---
                const lastSeenDate = new Date(child.lastSeen).toDateString();
                const currentDate = now.toDateString();
                const dayRolledOver = lastSeenDate !== currentDate;
                if (dayRolledOver) {
                    usedMinutes = 0;
                    yield logRepo.save(logRepo.create({
                        childId,
                        actionType: "POLICY_SYNC",
                        details: "Daily screen time allotment reset.",
                    }));
                }
                // --- Build update object ---
                const updates = Object.assign({ battery: validatedBattery, location: validatedLocation, usedMinutes, lastSeen: now, 
                    // Only accept tampered=true from device; compliant status requires absence of tamper flag
                    complianceStatus: data.tamper === true ? "tampered" : child.complianceStatus }, (child.status === "offline" ? { status: "active" } : {}));
                // --- Append to locationHistory (capped at 200 entries) ---
                // Only record a new point when the device has moved by at least ~15 metres
                // (0.00015° latitude ≈ 16.7 m). This prevents filling the 200-entry cap
                // with duplicate coordinates when the device is stationary.
                const MIN_MOVEMENT_DEG = 0.00015;
                const lastHistoryEntry = Array.isArray(child.locationHistory) && child.locationHistory.length > 0
                    ? child.locationHistory[child.locationHistory.length - 1]
                    : null;
                const movedEnough = validatedLocation && (!lastHistoryEntry ||
                    Math.abs(validatedLocation.lat - lastHistoryEntry.lat) > MIN_MOVEMENT_DEG ||
                    Math.abs(validatedLocation.lng - lastHistoryEntry.lng) > MIN_MOVEMENT_DEG);
                if (movedEnough) {
                    const history = Array.isArray(child.locationHistory) ? [...child.locationHistory] : [];
                    history.push({ lat: validatedLocation.lat, lng: validatedLocation.lng, timestamp: now });
                    if (history.length > 200)
                        history.splice(0, history.length - 200);
                    updates.locationHistory = history;
                }
                // Zero out per-app usage on day rollover. Apps in today's heartbeat will overwrite
                // these zeros below; apps not used today correctly show 0 instead of yesterday's totals.
                if (dayRolledOver && child.appUsage && child.appUsage.length > 0) {
                    updates.appUsage = child.appUsage.map((app) => (Object.assign(Object.assign({}, app), { timeSpentMinutes: 0 })));
                }
                // --- App inventory update ---
                // Handles two payload shapes:
                //   data.apps       — array format sent by future JS-layer integrations
                //   data.appUsage   — object map { packageName: minutes } sent by native MonitorService
                if (data.apps && Array.isArray(data.apps)) {
                    updates.lastInventoryScan = now;
                    const currentApps = child.appUsage || [];
                    updates.appUsage = data.apps.map((app) => {
                        const existing = currentApps.find((ea) => ea.packageName === app.packageName || ea.name === app.name);
                        return {
                            name: app.name,
                            packageName: app.packageName,
                            timeSpentMinutes: existing ? existing.timeSpentMinutes : 0,
                            limitMinutes: existing ? existing.limitMinutes : 0,
                            category: existing ? existing.category : "Uncategorized",
                        };
                    });
                }
                else if (data.appUsage && typeof data.appUsage === 'object' && !Array.isArray(data.appUsage)) {
                    updates.lastInventoryScan = now;
                    const currentApps = child.appUsage ? [...child.appUsage] : [];
                    for (const [packageName, minutes] of Object.entries(data.appUsage)) {
                        if (typeof minutes !== 'number')
                            continue;
                        const idx = currentApps.findIndex((ea) => ea.packageName === packageName);
                        if (idx >= 0) {
                            currentApps[idx] = Object.assign(Object.assign({}, currentApps[idx]), { timeSpentMinutes: minutes });
                        }
                        else {
                            currentApps.push({
                                name: packageName,
                                packageName,
                                timeSpentMinutes: minutes,
                                limitMinutes: 0,
                                category: "Uncategorized",
                            });
                        }
                    }
                    updates.appUsage = currentApps;
                }
                yield childRepo.update(childId, updates);
                // --- Immediate recovery notification (heartbeat-triggered) ---
                // If the device was offline and just checked in, notify the parent immediately
                // without waiting for the next integrity task cycle (up to 60s gap).
                if (child.status === "offline" && child.parent) {
                    yield this.notificationService.sendToParent(child.parent.id, "NODE BACK ONLINE", `${child.name} has reconnected to the cluster.`, { type: "ONLINE", childId });
                }
                // --- SOS processing ---
                if (data.sos === true) {
                    yield alertRepo.save(alertRepo.create({
                        childId,
                        type: "sos_emergency",
                        message: `CRITICAL: SOS triggered on ${child.name}'s device.`,
                        severity: "critical",
                    }));
                    if (child.parent) {
                        yield this.notificationService.sendToParent(child.parent.id, `SOS Alert: ${child.name}`, `Emergency SOS was triggered on ${child.name}'s device.`, { type: "SOS", childId });
                    }
                }
                // --- Fetch & deliver pending commands ---
                const commands = yield this.commandRepo.find({
                    where: { childId, status: "pending" },
                    order: { createdAt: "ASC" },
                });
                if (commands.length > 0) {
                    yield this.commandRepo.update(commands.map((c) => c.id), { status: "delivered" });
                }
                // --- Pending reward minutes ---
                const rewardRepo = manager.getRepository(Reward_1.RewardEntity);
                const pendingRewards = yield rewardRepo.find({ where: { childId, claimed: false } });
                const pendingRewardMinutes = pendingRewards.reduce((sum, r) => sum + r.minutes, 0);
                // If the daily limit has been reached, the device must be locked system-wide
                // regardless of the parent-set status. The native updateLocalPolicy() triggers
                // showHardLockOverlay() when status === "paused", so returning "paused" here
                // is sufficient to enforce the limit on all apps, not just Cylux itself.
                const resolvedStatus = (_a = updates.status) !== null && _a !== void 0 ? _a : child.status;
                const effectiveStatus = child.dailyLimitMinutes > 0 && usedMinutes >= child.dailyLimitMinutes
                    ? "paused"
                    : resolvedStatus;
                const lockReason = child.dailyLimitMinutes > 0 && usedMinutes >= child.dailyLimitMinutes
                    ? "daily_limit"
                    : resolvedStatus === "paused" ? "manual" : null;
                return {
                    policyVersion: now.getTime(),
                    policy: {
                        id: child.id,
                        status: effectiveStatus,
                        lockReason,
                        webFilter: child.webFilter,
                        dailyLimit: child.dailyLimitMinutes,
                        dailyLimitMinutes: child.dailyLimitMinutes,
                        usedMinutes,
                        blockedApps: child.blockedApps,
                        geofences: child.geofences,
                        schedules: child.schedules,
                        pendingRewardMinutes,
                        // Per-app time limits: { "com.package": minutes } — consumed by MonitorService
                        // and EnforcementEngine to enforce via AppUsageTrackerService.
                        appTimeLimits: Object.fromEntries((child.appUsage || [])
                            .filter((a) => a.limitMinutes > 0)
                            .map((a) => [a.packageName, a.limitMinutes])),
                    },
                    commands: commands.map((c) => ({ id: c.id, type: c.type, payload: c.payload })),
                };
            }));
            // Fire timed geofence checks outside the transaction so the row lock is released first.
            // Errors are swallowed — a failed timed check must never break the heartbeat response.
            if (((_a = data.location) === null || _a === void 0 ? void 0 : _a.lat) != null && ((_b = data.location) === null || _b === void 0 ? void 0 : _b.lng) != null) {
                this.checkTimedGeofenceAlerts(childId, data.location.lat, data.location.lng, typeof data.timezone === 'string' ? data.timezone : 'UTC').catch((e) => console.warn(`[TimedGeofence] check failed for ${childId}: ${e.message}`));
            }
            return result;
        });
    }
    // ── Helpers ────────────────────────────────────────────────────────────────
    /** Haversine distance in metres between two lat/lng points. */
    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = (d) => (d * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    /** Returns local time info for a given IANA timezone using built-in Intl — no external deps. */
    getLocalInfo(timezone) {
        try {
            const tz = timezone || 'UTC';
            const now = new Date();
            // "en-CA" gives YYYY-MM-DD date format
            const dateStr = now.toLocaleDateString('en-CA', { timeZone: tz });
            // hour12:false gives 24-hour HH:MM
            const timeStr = now.toLocaleTimeString('en-CA', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
            // 3-letter weekday abbreviation (Mon, Tue, …)
            const dayAbbr = now.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' });
            return { timeStr, dateStr, dayAbbr };
        }
        catch (_a) {
            const now = new Date();
            return {
                timeStr: now.toISOString().slice(11, 16),
                dateStr: now.toISOString().slice(0, 10),
                dayAbbr: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getUTCDay()],
            };
        }
    }
    /**
     * Server-side timed geofence checks — runs after every heartbeat (outside the row lock).
     * Fires GEOFENCE_OVERDUE if child is still inside a zone past its departure deadline,
     * and GEOFENCE_MISSING if child is not inside a zone by its arrival deadline.
     * Each alert fires at most once per calendar day per zone (deduplication via lastMissed* timestamps).
     */
    checkTimedGeofenceAlerts(childId, lat, lng, timezone) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const child = yield this.childRepo.findOne({ where: { id: childId } });
            if (!((_a = child === null || child === void 0 ? void 0 : child.geofences) === null || _a === void 0 ? void 0 : _a.length))
                return;
            const { timeStr, dateStr, dayAbbr } = this.getLocalInfo(timezone);
            const alertService = new alert_service_1.AlertService();
            let needsUpdate = false;
            for (const zone of child.geofences) {
                if (!zone.enabled)
                    continue;
                const insideZone = this.haversineDistance(lat, lng, zone.lat, zone.lng) <= zone.radius;
                // ── Missed Departure ──────────────────────────────────────────────────
                if (zone.alertOnMissedDeparture && insideZone) {
                    const days = (_b = zone.missedDepartureDays) !== null && _b !== void 0 ? _b : ALL_DAYS;
                    const alreadyFiredToday = (_c = zone.lastMissedDepartureAlert) === null || _c === void 0 ? void 0 : _c.startsWith(dateStr);
                    if (days.includes(dayAbbr) &&
                        timeStr >= zone.alertOnMissedDeparture &&
                        !alreadyFiredToday) {
                        yield alertService.createLog({
                            childId,
                            actionType: 'GEOFENCE_OVERDUE',
                            details: `Still at "${zone.name}" past ${zone.alertOnMissedDeparture}`,
                            isFlagged: true,
                            metadata: { zoneId: zone.id, zoneName: zone.name, type: 'missed_departure' },
                        });
                        zone.lastMissedDepartureAlert = new Date().toISOString();
                        needsUpdate = true;
                    }
                }
                // ── Missed Arrival ────────────────────────────────────────────────────
                if (zone.alertOnMissedArrival && !insideZone) {
                    const days = (_d = zone.missedArrivalDays) !== null && _d !== void 0 ? _d : ALL_DAYS;
                    const alreadyFiredToday = (_e = zone.lastMissedArrivalAlert) === null || _e === void 0 ? void 0 : _e.startsWith(dateStr);
                    if (days.includes(dayAbbr) &&
                        timeStr >= zone.alertOnMissedArrival &&
                        !alreadyFiredToday) {
                        yield alertService.createLog({
                            childId,
                            actionType: 'GEOFENCE_MISSING',
                            details: `Not at "${zone.name}" by ${zone.alertOnMissedArrival}`,
                            isFlagged: true,
                            metadata: { zoneId: zone.id, zoneName: zone.name, type: 'missed_arrival' },
                        });
                        zone.lastMissedArrivalAlert = new Date().toISOString();
                        needsUpdate = true;
                    }
                }
            }
            // Persist updated lastMissed* timestamps back to the JSONB column
            if (needsUpdate) {
                yield this.childRepo.update(childId, { geofences: child.geofences });
            }
        });
    }
    checkIntegrity() {
        return __awaiter(this, void 0, void 0, function* () {
            const offlineThreshold = new Date(Date.now() - 120000); // 2 minutes
            const recoveryThreshold = new Date(Date.now() - 90000); // 90 seconds
            // Mark newly offline nodes (haven't sent a heartbeat in 2+ minutes)
            const offlineNodes = yield this.childRepo.find({
                where: { lastSeen: (0, typeorm_1.LessThan)(offlineThreshold), status: "active" },
                relations: ["parent"],
            });
            for (const node of offlineNodes) {
                yield this.childRepo.update(node.id, { status: "offline" });
                if (node.parent) {
                    yield this.notificationService.sendToParent(node.parent.id, "NODE OFFLINE", `${node.name} has disconnected from the cluster.`, { type: "OFFLINE", childId: node.id });
                }
            }
            // Safety-net recovery: heartbeat-triggered recovery already handles the common case
            // (see processHeartbeat), but this catches any nodes where heartbeat route failed.
            const recoveredNodes = yield this.childRepo.find({
                where: { lastSeen: (0, typeorm_1.MoreThan)(recoveryThreshold), status: "offline" },
                relations: ["parent"],
            });
            for (const node of recoveredNodes) {
                yield this.childRepo.update(node.id, { status: "active" });
                if (node.parent) {
                    yield this.notificationService.sendToParent(node.parent.id, "NODE BACK ONLINE", `${node.name} has reconnected to the cluster.`, { type: "ONLINE", childId: node.id });
                }
            }
            return { markedOffline: offlineNodes.length, recovered: recoveredNodes.length };
        });
    }
    queueCommand(childId_1, type_1) {
        return __awaiter(this, arguments, void 0, function* (childId, type, payload = {}) {
            if (!ALLOWED_COMMAND_TYPES.includes(type)) {
                throw new Error(`Invalid command type: ${type}`);
            }
            if (payload !== null && (typeof payload !== "object" || Array.isArray(payload))) {
                throw new Error("Command payload must be a plain object");
            }
            const command = yield this.commandRepo.save(this.commandRepo.create({ childId, type, payload, status: "pending" }));
            // Persist the parent's lock/unlock intent immediately.
            //
            // Without this, the heartbeat response returns policy.status="active" even
            // after a LOCK command is queued.  MonitorService then calls:
            //   handleServerCommand("LOCK")  → showHardLockOverlay()   ← overlay shown
            //   updateLocalPolicy("active")  → hideHardLockOverlay()   ← overlay hidden!
            // …undoing the lock in the same heartbeat cycle.
            //
            // Setting status here ensures:
            //  • The heartbeat response returns policy.status="paused" for LOCK, so
            //    updateLocalPolicy() reinforces rather than cancels the overlay.
            //  • The dashboard immediately shows "Locked" instead of oscillating
            //    between "Locked" (optimistic) and "Offline"/"Online" (DB refresh).
            //  • checkIntegrity() skips "paused" devices when marking offline, so the
            //    lock intent survives device downtime until the next reconnect.
            if (type === "LOCK") {
                yield this.childRepo.update(childId, { status: "paused" });
            }
            else if (type === "UNLOCK") {
                yield this.childRepo.update(childId, { status: "active" });
            }
            // Fire-and-forget: power the linked Samsung/LG TV off on LOCK, on on UNLOCK.
            // Errors are swallowed so a misconfigured smart device never blocks the command.
            if (type === "LOCK" || type === "UNLOCK") {
                const action = type === "LOCK" ? "off" : "on";
                new smartDevice_service_1.SmartDeviceService()
                    .controlByChild(childId, action)
                    .catch((e) => console.warn(`[SmartDevice] Auto-control failed for child ${childId}: ${e.message}`));
            }
            return command;
        });
    }
    updateChild(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const node = yield this.childRepo.findOne({ where: { id } });
            if (!node)
                throw new Error("Node not found");
            // Snapshot before-state for audit trail
            const before = {
                status: node.status,
                dailyLimitMinutes: node.dailyLimitMinutes,
                blockedApps: node.blockedApps,
                webFilter: node.webFilter,
            };
            // Whitelist: only allow safe parent-controlled fields
            const { name, status, dailyLimitMinutes, blockedApps, webFilter, geofences, schedules, appUsage, fcmToken, } = updates;
            const safeUpdates = {};
            if (name !== undefined)
                safeUpdates.name = name;
            if (status !== undefined)
                safeUpdates.status = status;
            if (dailyLimitMinutes !== undefined)
                safeUpdates.dailyLimitMinutes = dailyLimitMinutes;
            if (blockedApps !== undefined)
                safeUpdates.blockedApps = blockedApps;
            if (webFilter !== undefined)
                safeUpdates.webFilter = webFilter;
            if (geofences !== undefined)
                safeUpdates.geofences = geofences;
            if (schedules !== undefined)
                safeUpdates.schedules = schedules;
            if (fcmToken !== undefined)
                safeUpdates.fcmToken = fcmToken;
            // appUsage allowed so parent can update per-app limitMinutes
            if (appUsage !== undefined && Array.isArray(appUsage))
                safeUpdates.appUsage = appUsage;
            Object.assign(node, safeUpdates);
            yield this.childRepo.save(node);
            // Audit trail: log before/after state
            const after = {
                status: node.status,
                dailyLimitMinutes: node.dailyLimitMinutes,
                blockedApps: node.blockedApps,
                webFilter: node.webFilter,
            };
            yield this.logRepo.save(this.logRepo.create({
                childId: id,
                actionType: "POLICY_SYNC",
                details: JSON.stringify({ before, after }),
                metadata: { triggerSource: "parent" },
            }));
            return yield this.queueCommand(id, "SYNC_POLICY", {
                status: node.status,
                dailyLimit: node.dailyLimitMinutes,
                dailyLimitMinutes: node.dailyLimitMinutes,
                blockedApps: node.blockedApps,
                webFilter: node.webFilter,
                geofences: node.geofences,
                schedules: node.schedules,
                appUsage: node.appUsage,
            });
        });
    }
    processLogBatch(logs, authenticatedDeviceId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield database_1.AppDataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                const childRepo = manager.getRepository(Child_1.ChildEntity);
                // Collect unique child IDs from the batch
                const childIds = [...new Set(logs.map((l) => l.childId).filter(Boolean))];
                // If we have an authenticated device ID, enforce ownership
                if (authenticatedDeviceId) {
                    const unauthorizedLog = logs.find((l) => l.childId !== authenticatedDeviceId);
                    if (unauthorizedLog) {
                        console.warn(`[LogBatch] Rejected: device ${authenticatedDeviceId} attempted to submit logs for ${unauthorizedLog.childId}`);
                        // Only keep logs belonging to the authenticated device
                        logs = logs.filter((l) => l.childId === authenticatedDeviceId);
                    }
                }
                // Verify all child IDs are enrolled
                if (childIds.length > 0) {
                    const enrolledChildren = yield childRepo.find({
                        where: childIds.map((id) => ({ id, isEnrolled: true })),
                    });
                    const enrolledIds = new Set(enrolledChildren.map((c) => c.id));
                    const rejected = logs.filter((l) => !enrolledIds.has(l.childId));
                    if (rejected.length > 0) {
                        console.warn(`[LogBatch] Rejected ${rejected.length} logs from unenrolled devices.`);
                    }
                    logs = logs.filter((l) => enrolledIds.has(l.childId));
                }
                if (logs.length === 0)
                    return [];
                const entities = logs.map((l) => manager.create(AuditLog_1.AuditLogEntity, l));
                return yield manager.save(entities);
            }));
        });
    }
    getChildrenPaginated(parentId_1) {
        return __awaiter(this, arguments, void 0, function* (parentId, page = 1, limit = 20) {
            const [children, total] = yield this.childRepo.findAndCount({
                where: { parent: { id: parentId } },
                take: Math.min(limit, 100),
                skip: (page - 1) * Math.min(limit, 100),
            });
            return { children, total, page, limit };
        });
    }
    getGeofenceAnalytics(childId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const logs = yield this.logRepo.find({
                where: {
                    childId,
                    actionType: (0, typeorm_1.In)(["GEOFENCE_ENTER", "GEOFENCE_EXIT", "GEOFENCE_DWELL"]),
                    timestamp: (0, typeorm_1.Between)(startDate, endDate),
                },
                order: { timestamp: "ASC" },
            });
            const zoneMap = {};
            for (const log of logs) {
                const zoneId = ((_a = log.metadata) === null || _a === void 0 ? void 0 : _a.zoneId) || "unknown";
                const zoneName = ((_b = log.metadata) === null || _b === void 0 ? void 0 : _b.zoneName) || "Unknown Zone";
                if (!zoneMap[zoneId]) {
                    zoneMap[zoneId] = {
                        zoneName,
                        entries: 0,
                        exits: 0,
                        totalDwellSeconds: 0,
                        lastEntry: null,
                        lastExit: null,
                    };
                }
                const zone = zoneMap[zoneId];
                if (log.actionType === "GEOFENCE_ENTER") {
                    zone.entries++;
                    zone.lastEntry = log.timestamp;
                }
                else if (log.actionType === "GEOFENCE_EXIT") {
                    zone.exits++;
                    zone.lastExit = log.timestamp;
                }
                else if (log.actionType === "GEOFENCE_DWELL") {
                    zone.totalDwellSeconds += ((_c = log.metadata) === null || _c === void 0 ? void 0 : _c.dwellTime) || 0;
                }
            }
            return {
                totalEvents: logs.length,
                zones: Object.entries(zoneMap).map(([zoneId, data]) => (Object.assign(Object.assign({ zoneId }, data), { averageDwellSeconds: data.entries > 0 ? Math.round(data.totalDwellSeconds / data.entries) : 0 }))),
                timeRange: { startDate, endDate },
            };
        });
    }
    /**
     * Parent responds to a child's time extension request.
     * - approved=true: extends dailyLimitMinutes, unlocks device if it was paused
     * - approved=false: just resolves the pending alert
     */
    respondTimeRequest(childId_1, parentId_1, approved_1) {
        return __awaiter(this, arguments, void 0, function* (childId, parentId, approved, extraMinutes = 30) {
            const child = yield this.childRepo.findOne({
                where: { id: childId, parent: { id: parentId } },
            });
            if (!child)
                throw new Error('Child not found or unauthorized');
            // Resolve the pending time_request alert (if any)
            const pendingAlert = yield alertRepo().findOne({
                where: { childId, type: 'time_request', isResolved: false },
            });
            if (pendingAlert) {
                pendingAlert.isResolved = true;
                pendingAlert.resolvedAt = new Date();
                yield alertRepo().save(pendingAlert);
            }
            if (!approved)
                return { approved: false };
            // Extend the daily limit
            const newLimit = child.dailyLimitMinutes + extraMinutes;
            const statusUpdate = { dailyLimitMinutes: newLimit };
            // Also unset the paused state if the device was locked due to limit
            if (child.status === 'paused') {
                statusUpdate.status = 'active';
            }
            yield this.childRepo.update(childId, statusUpdate);
            // Queue UNLOCK so the device receives the command on the next heartbeat
            yield this.queueCommand(childId, 'UNLOCK');
            console.log(`[ChildService] Time request approved for ${childId}: +${extraMinutes}m (new limit: ${newLimit}m)`);
            return { approved: true, newLimit, extraMinutes };
        });
    }
    /** Returns the installed app list for a child device (for parent app picker UI). */
    getInstalledApps(childId, parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const child = yield this.childRepo.findOne({
                where: { id: childId, parent: { id: parentId } },
            });
            if (!child)
                throw new Error('Child not found or unauthorized');
            return (child.appUsage || [])
                .map((a) => ({ name: a.name || a.packageName, packageName: a.packageName }))
                .sort((a, b) => a.name.localeCompare(b.name));
        });
    }
    /** Returns the pending time request alert for a child, if any. */
    getPendingTimeRequest(childId, parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const child = yield this.childRepo.findOne({
                where: { id: childId, parent: { id: parentId } },
            });
            if (!child)
                throw new Error('Child not found or unauthorized');
            return yield alertRepo().findOne({
                where: { childId, type: 'time_request', isResolved: false },
                order: { timestamp: 'DESC' },
            });
        });
    }
    getVpnStats(childId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const logs = yield this.logRepo.find({
                where: { childId, actionType: "VPN_STATUS" },
                order: { timestamp: "DESC" },
                take: 100,
            });
            if (logs.length === 0) {
                return {
                    vpnEnabled: false,
                    blockedDomainsCount: 0,
                    blockedDomains: [],
                    lastStatus: "unknown",
                    uptime: "0%",
                };
            }
            const mostRecent = logs[0];
            const lastStatus = ((_a = mostRecent.metadata) === null || _a === void 0 ? void 0 : _a.vpnStatus) || "unknown";
            const blockedDomains = ((_b = mostRecent.metadata) === null || _b === void 0 ? void 0 : _b.blockedDomains) || [];
            // Calculate uptime: percentage of intervals where status was 'running'
            const running = logs.filter((l) => { var _a; return ((_a = l.metadata) === null || _a === void 0 ? void 0 : _a.vpnStatus) === "running"; }).length;
            const uptime = `${Math.round((running / logs.length) * 100)}%`;
            // Get the child's current web filter for domain count
            const child = yield this.childRepo.findOne({ where: { id: childId } });
            const blockedDomainsCount = ((_d = (_c = child === null || child === void 0 ? void 0 : child.webFilter) === null || _c === void 0 ? void 0 : _c.blockedDomains) === null || _d === void 0 ? void 0 : _d.length) || 0;
            return {
                vpnEnabled: lastStatus === "running",
                blockedDomainsCount,
                blockedDomains: ((_e = child === null || child === void 0 ? void 0 : child.webFilter) === null || _e === void 0 ? void 0 : _e.blockedDomains) || blockedDomains,
                lastStatus,
                uptime,
            };
        });
    }
    /**
     * Returns the current policy for a device — used by the child app's
     * checkPairing (verify still enrolled) and initializePolicy (LockScreen polling).
     */
    getDevicePolicy(childId) {
        return __awaiter(this, void 0, void 0, function* () {
            const child = yield this.childRepo.findOne({ where: { id: childId, isEnrolled: true } });
            if (!child)
                throw new Error("Device not found or not enrolled");
            const rewardRepo = database_1.AppDataSource.getRepository(Reward_1.RewardEntity);
            const pendingRewards = yield rewardRepo.find({ where: { childId, claimed: false } });
            const pendingRewardMinutes = pendingRewards.reduce((sum, r) => sum + r.minutes, 0);
            const effectiveStatus = child.dailyLimitMinutes > 0 && child.usedMinutes >= child.dailyLimitMinutes
                ? "paused"
                : child.status;
            const policyLockReason = child.dailyLimitMinutes > 0 && child.usedMinutes >= child.dailyLimitMinutes
                ? "daily_limit"
                : child.status === "paused" ? "manual" : null;
            return {
                id: child.id,
                status: effectiveStatus,
                lockReason: policyLockReason,
                webFilter: child.webFilter,
                dailyLimit: child.dailyLimitMinutes,
                dailyLimitMinutes: child.dailyLimitMinutes,
                usedMinutes: child.usedMinutes,
                blockedApps: child.blockedApps,
                geofences: child.geofences,
                schedules: child.schedules,
                pendingRewardMinutes,
            };
        });
    }
}
exports.ChildService = ChildService;
//# sourceMappingURL=child.service.js.map