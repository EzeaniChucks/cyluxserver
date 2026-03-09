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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParentService = void 0;
const database_1 = require("../database");
const Parent_1 = require("../entities/Parent");
const Child_1 = require("../entities/Child");
const Alert_1 = require("../entities/Alert");
/**
 * Computes the effective (parent-visible) status and the reason for any lock.
 * Priority: daily limit > manual lock > schedule > none.
 */
function computeLockState(child) {
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
function isScheduleBlockedNow(schedules) {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[now.getDay()];
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hh}:${mm}`;
    return schedules.some(s => {
        if (!s.active)
            return false;
        if (s.day !== 'Everyday' && s.day !== dayName)
            return false;
        return currentTime >= s.startTime && currentTime < s.endTime;
    });
}
class ParentService {
    constructor() {
        this.parentRepo = database_1.AppDataSource.getRepository(Parent_1.ParentEntity);
        this.childRepo = database_1.AppDataSource.getRepository(Child_1.ChildEntity);
        this.alertRepo = database_1.AppDataSource.getRepository(Alert_1.AlertEntity);
    }
    getParentProfile(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const parent = yield this.parentRepo.findOne({
                where: { id: parentId },
                relations: ['children']
            });
            if (!parent)
                throw new Error('Parent not found');
            const _a = parent, { passwordHash, failedLoginAttempts, lockedUntil, resetPasswordToken, resetPasswordExpires } = _a, safeParent = __rest(_a, ["passwordHash", "failedLoginAttempts", "lockedUntil", "resetPasswordToken", "resetPasswordExpires"]);
            return safeParent;
        });
    }
    getDashboardSummary(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [children] = yield this.childRepo.findAndCount({
                where: { parent: { id: parentId } },
                take: 50,
            });
            const alerts = yield this.alertRepo.find({
                where: { child: { parent: { id: parentId } } },
                order: { timestamp: 'DESC' },
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
        });
    }
    getAlertsPaginated(parentId_1) {
        return __awaiter(this, arguments, void 0, function* (parentId, page = 1, limit = 50) {
            const safeLimit = Math.min(limit, 100);
            const [alerts, total] = yield this.alertRepo.findAndCount({
                where: { child: { parent: { id: parentId } } },
                order: { timestamp: 'DESC' },
                take: safeLimit,
                skip: (page - 1) * safeLimit,
            });
            return { alerts, total, page, limit: safeLimit };
        });
    }
    updateProfile(parentId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const _a = updates, { id, passwordHash, email, failedLoginAttempts, lockedUntil, resetPasswordToken, resetPasswordExpires } = _a, allowedUpdates = __rest(_a, ["id", "passwordHash", "email", "failedLoginAttempts", "lockedUntil", "resetPasswordToken", "resetPasswordExpires"]);
            yield this.parentRepo.update(parentId, allowedUpdates);
            return this.getParentProfile(parentId);
        });
    }
}
exports.ParentService = ParentService;
//# sourceMappingURL=parent.service.js.map