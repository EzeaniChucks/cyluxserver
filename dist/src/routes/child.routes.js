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
const express_1 = require("express");
const child_controller_1 = require("../controllers/child.controller");
const pairing_service_1 = require("../services/pairing.service");
const response_1 = require("../utils/response");
const auth_1 = require("../middlewares/auth");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const subscription_service_1 = require("../services/subscription.service");
const database_1 = require("../database");
const Child_1 = require("../entities/Child");
const router = (0, express_1.Router)();
const childController = new child_controller_1.ChildController();
const pairingService = new pairing_service_1.PairingService();
const childRepo = database_1.AppDataSource.getRepository(Child_1.ChildEntity);
// --- Parent Controlled Routes ---
router.get("/", auth_1.protectParent, childController.getChildren);
router.patch("/:id", auth_1.protectParent, childController.updateChild);
router.post("/:id/command", auth_1.protectParent, childController.triggerCommand);
// Time extension request (child → parent flow)
router.get("/:childId/time-request", auth_1.protectParent, childController.getPendingTimeRequest);
router.post("/:childId/time-request/respond", auth_1.protectParent, childController.respondTimeRequest);
// Installed app list (for parent app-picker UI)
router.get("/:childId/apps", auth_1.protectParent, childController.getInstalledApps);
// --- Device Pairing (rate-limited, unauthenticated — issues the device JWT) ---
router.post("/pair", rateLimiter_1.pairingLimiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code, deviceId, deviceType } = req.body;
        // Input validation
        if (!code || !/^\d{6}$/.test(String(code))) {
            return response_1.ApiResponse.error(res, "Invalid pairing code format. Must be 6 digits.", 400);
        }
        if (!deviceId || typeof deviceId !== "string" || deviceId.trim().length === 0 || deviceId.length > 255) {
            return response_1.ApiResponse.error(res, "Invalid device ID.", 400);
        }
        if (deviceType && !["ios", "android"].includes(deviceType)) {
            return response_1.ApiResponse.error(res, "Invalid device type. Must be 'ios' or 'android'.", 400);
        }
        // Resolve the parentId from the pairing code before checking limits
        const pairing = yield pairingService.findByCode(code);
        if (!pairing) {
            return response_1.ApiResponse.error(res, "Invalid or expired pairing code", 400);
        }
        // Enforce plan device limit before completing pairing.
        // Skip the check for re-enrollments — the device already occupies a slot.
        const isReenrollment = yield childRepo.findOne({
            where: { id: deviceId.trim(), parent: { id: pairing.parentId }, isEnrolled: true },
        });
        if (!isReenrollment) {
            const enrolledCount = yield childRepo.count({
                where: { parent: { id: pairing.parentId }, isEnrolled: true },
            });
            const { allowed, limit } = yield subscription_service_1.subscriptionService.checkLimit(pairing.parentId, 'maxDevices');
            if (!allowed || (limit !== Infinity && enrolledCount >= limit)) {
                const limitLabel = limit === Infinity ? 'unlimited' : String(limit);
                return response_1.ApiResponse.error(res, `Your plan allows ${limitLabel} device(s). Upgrade to add more.`, 403);
            }
        }
        const result = yield pairingService.pairDevice(code, deviceId.trim(), deviceType);
        return response_1.ApiResponse.success(res, { child: result.child, deviceToken: result.deviceToken }, "Device successfully paired");
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
// --- Child Device Routes (all protected by device JWT) ---
router.post("/:childId/heartbeat", auth_1.protectChild, childController.heartbeat);
router.post("/:childId/command/:commandId/ack", auth_1.protectChild, childController.acknowledgeCommand);
exports.default = router;
//# sourceMappingURL=child.routes.js.map