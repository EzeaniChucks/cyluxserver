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
exports.ChildController = void 0;
const child_service_1 = require("../services/child.service");
const response_1 = require("../utils/response");
const database_1 = require("../database");
const Child_1 = require("../entities/Child");
const Command_1 = require("../entities/Command");
const AuditLog_1 = require("../entities/AuditLog");
const VALID_COMMAND_TYPES = [
    'LOCK', 'UNLOCK', 'PLAY_SIREN', 'SYNC_POLICY', 'WIPE_BROWSER',
    'REMOTE_WIPE', 'REBOOT', 'INVENTORY_SCAN',
    'HIDE_ICON', 'SHOW_ICON', 'SET_PARENT_PIN',
    'ENABLE_SETTINGS_GUARD', 'DISABLE_SETTINGS_GUARD',
];
class ChildController {
    constructor() {
        this.childService = new child_service_1.ChildService();
        this.childRepo = database_1.AppDataSource.getRepository(Child_1.ChildEntity);
        this.commandRepo = database_1.AppDataSource.getRepository(Command_1.CommandEntity);
        this.logRepo = database_1.AppDataSource.getRepository(AuditLog_1.AuditLogEntity);
        this.heartbeat = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Always use the device identity from the verified JWT — never the URL param,
                // which could be spoofed to submit heartbeats on behalf of another device.
                const childId = req.deviceId;
                if (!childId)
                    return response_1.ApiResponse.error(res, 'Device context missing', 400);
                const result = yield this.childService.processHeartbeat(childId, req.body);
                return response_1.ApiResponse.success(res, result, 'Heartbeat synced');
            }
            catch (error) {
                console.log("heartbeat error", error.message);
                return response_1.ApiResponse.error(res, error.message);
            }
        });
        this.triggerCommand = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const parentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const child = yield this.childRepo.findOne({
                    where: { id, parent: { id: parentId } },
                });
                if (!child)
                    return response_1.ApiResponse.error(res, 'Managed node not found or unauthorized', 403);
                const { type, payload } = req.body;
                // Validate command type
                if (!type || !VALID_COMMAND_TYPES.includes(type)) {
                    return response_1.ApiResponse.error(res, `Invalid command type. Allowed: ${VALID_COMMAND_TYPES.join(', ')}`, 400);
                }
                // Validate payload is a plain object if provided
                if (payload !== undefined && payload !== null) {
                    if (typeof payload !== 'object' || Array.isArray(payload)) {
                        return response_1.ApiResponse.error(res, 'Command payload must be a plain object', 400);
                    }
                }
                const command = yield this.childService.queueCommand(id, type, payload || {});
                // Mirror icon/guard state optimistically so the parent UI shows the new state immediately.
                if (type === 'HIDE_ICON') {
                    child.iconHidden = true;
                    yield this.childRepo.save(child);
                }
                if (type === 'SHOW_ICON') {
                    child.iconHidden = false;
                    yield this.childRepo.save(child);
                }
                if (type === 'SET_PARENT_PIN' || type === 'ENABLE_SETTINGS_GUARD') {
                    child.settingsGuardEnabled = true;
                    // Also block the Cylux app itself so the child cannot open the setup screen.
                    const CYLUX_PKG = 'com.cyluxchild';
                    if (!child.blockedApps.includes(CYLUX_PKG)) {
                        child.blockedApps = [...child.blockedApps, CYLUX_PKG];
                    }
                    yield this.childRepo.save(child);
                }
                if (type === 'DISABLE_SETTINGS_GUARD') {
                    child.settingsGuardEnabled = false;
                    // Remove the Cylux app from the blocked list when the guard is lifted.
                    child.blockedApps = child.blockedApps.filter((p) => p !== 'com.cyluxchild');
                    yield this.childRepo.save(child);
                }
                return response_1.ApiResponse.success(res, Object.assign(Object.assign({}, command), { iconHidden: child.iconHidden, settingsGuardEnabled: child.settingsGuardEnabled, blockedApps: child.blockedApps }), 'Command queued');
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message);
            }
        });
        this.acknowledgeCommand = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { childId, commandId } = req.params;
                const authenticatedDeviceId = req.deviceId;
                // Ensure device can only ACK its own commands
                if (childId !== authenticatedDeviceId) {
                    return response_1.ApiResponse.error(res, 'Unauthorized: Cannot acknowledge commands for another device', 403);
                }
                const command = yield this.commandRepo.findOne({
                    where: { id: commandId, childId },
                });
                if (!command)
                    return response_1.ApiResponse.error(res, 'Command not found', 404);
                command.status = 'executed';
                yield this.commandRepo.save(command);
                // Audit log the execution
                yield this.logRepo.save(this.logRepo.create({
                    childId,
                    actionType: 'COMMAND_EXECUTED',
                    details: `Command ${command.type} executed successfully`,
                    metadata: { commandId, commandType: command.type, commandResult: 'success' },
                }));
                return response_1.ApiResponse.success(res, null, 'Command acknowledged');
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message);
            }
        });
        this.getChildren = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const parentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { page = 1, limit = 20 } = req.query;
                const result = yield this.childService.getChildrenPaginated(parentId, Number(page), Number(limit));
                return response_1.ApiResponse.success(res, result);
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message);
            }
        });
        this.respondTimeRequest = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { childId } = req.params;
                const parentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { approved, extraMinutes = 30 } = req.body;
                if (typeof approved !== 'boolean') {
                    return response_1.ApiResponse.error(res, 'approved (boolean) is required', 400);
                }
                const result = yield this.childService.respondTimeRequest(childId, parentId, approved, Number(extraMinutes));
                return response_1.ApiResponse.success(res, result, approved ? 'Time extension granted' : 'Request denied');
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message);
            }
        });
        this.getInstalledApps = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { childId } = req.params;
                const parentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const apps = yield this.childService.getInstalledApps(childId, parentId);
                return response_1.ApiResponse.success(res, apps);
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message);
            }
        });
        this.getPendingTimeRequest = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { childId } = req.params;
                const parentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const request = yield this.childService.getPendingTimeRequest(childId, parentId);
                return response_1.ApiResponse.success(res, request);
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message);
            }
        });
        this.updateChild = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const parentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const childCheck = yield this.childRepo.findOne({
                    where: { id, parent: { id: parentId } },
                });
                if (!childCheck)
                    return response_1.ApiResponse.error(res, 'Unauthorized access to node', 403);
                // Whitelist: only pass safe, parent-controllable fields
                const { name, status, dailyLimitMinutes, blockedApps, webFilter, geofences, schedules, fcmToken, appUsage, } = req.body;
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
                if (appUsage !== undefined && Array.isArray(appUsage))
                    safeUpdates.appUsage = appUsage;
                const result = yield this.childService.updateChild(id, safeUpdates);
                return response_1.ApiResponse.success(res, result, 'Node policy updated');
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message);
            }
        });
        this.getDevicePolicy = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const childId = req.deviceId;
                const policy = yield this.childService.getDevicePolicy(childId);
                return response_1.ApiResponse.success(res, policy, 'Policy fetched');
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message, 404);
            }
        });
    }
}
exports.ChildController = ChildController;
//# sourceMappingURL=child.controller.js.map