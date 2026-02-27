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
const response_1 = require("../utils/response");
const auth_1 = require("../middlewares/auth");
const database_1 = require("../database");
const Child_1 = require("../entities/Child");
const child_service_1 = require("../services/child.service");
const subscription_service_1 = require("../services/subscription.service");
const router = (0, express_1.Router)();
const childRepo = database_1.AppDataSource.getRepository(Child_1.ChildEntity);
const childService = new child_service_1.ChildService();
// Get real geofence analytics
router.get("/analytics/:childId", auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { childId } = req.params;
        const { startDate, endDate } = req.query;
        const child = yield childRepo.findOne({
            where: { id: childId, parent: { id: req.user.id } },
        });
        if (!child)
            return response_1.ApiResponse.error(res, "Child not found", 404);
        const start = startDate ? new Date(String(startDate)) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(String(endDate)) : new Date();
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return response_1.ApiResponse.error(res, "Invalid date format", 400);
        }
        if (end.getTime() - start.getTime() > 90 * 24 * 60 * 60 * 1000) {
            return response_1.ApiResponse.error(res, "Date range cannot exceed 90 days", 400);
        }
        const analytics = yield childService.getGeofenceAnalytics(childId, start, end);
        return response_1.ApiResponse.success(res, analytics, "Geofence analytics");
    }
    catch (error) {
        return response_1.ApiResponse.error(res, error.message);
    }
}));
// Update geofences for a child
router.put("/:childId", auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { childId } = req.params;
        const { geofences } = req.body;
        if (!Array.isArray(geofences)) {
            return response_1.ApiResponse.error(res, "Geofences must be an array", 400);
        }
        if (geofences.length > 20) {
            return response_1.ApiResponse.error(res, "Maximum 20 geofences allowed", 400);
        }
        // Enforce plan geofence limit
        const { allowed, limit } = yield subscription_service_1.subscriptionService.checkLimit(req.user.id, 'maxGeofences');
        if (!allowed || (limit !== Infinity && geofences.length > limit)) {
            const limitLabel = limit === Infinity ? 'unlimited' : String(limit);
            return response_1.ApiResponse.error(res, `Your plan allows ${limitLabel} geofence(s) per child. Upgrade to add more.`, 403);
        }
        const child = yield childRepo.findOne({
            where: { id: childId, parent: { id: req.user.id } },
        });
        if (!child)
            return response_1.ApiResponse.error(res, "Child not found", 404);
        // Validate each geofence with strict bounds checking
        const validatedGeofences = [];
        for (let i = 0; i < geofences.length; i++) {
            const g = geofences[i];
            const lat = parseFloat(g.lat);
            const lng = parseFloat(g.lng);
            const radius = parseFloat(g.radius) || 100;
            if (isNaN(lat) || lat < -90 || lat > 90) {
                return response_1.ApiResponse.error(res, `Invalid latitude at index ${i}. Must be between -90 and 90.`, 400);
            }
            if (isNaN(lng) || lng < -180 || lng > 180) {
                return response_1.ApiResponse.error(res, `Invalid longitude at index ${i}. Must be between -180 and 180.`, 400);
            }
            if (radius < 10 || radius > 50000) {
                return response_1.ApiResponse.error(res, `Invalid radius at index ${i}. Must be between 10 and 50000 metres.`, 400);
            }
            if (!g.name || typeof g.name !== "string" || g.name.trim().length === 0) {
                return response_1.ApiResponse.error(res, `Missing or invalid name at geofence index ${i}.`, 400);
            }
            if (g.name.length > 100) {
                return response_1.ApiResponse.error(res, `Name too long at geofence index ${i}. Maximum 100 characters.`, 400);
            }
            validatedGeofences.push({
                id: g.id || `zone_${Date.now()}_${i}`,
                name: g.name.trim(),
                lat,
                lng,
                radius,
                type: ["safe", "restricted", "notification"].includes(g.type) ? g.type : "notification",
                notifyOn: Array.isArray(g.notifyOn) ? g.notifyOn : ["ENTER", "EXIT"],
                dwellTime: typeof g.dwellTime === "number" ? g.dwellTime : 60,
                enabled: g.enabled !== false,
                createdAt: g.createdAt ? new Date(g.createdAt) : new Date(),
                updatedAt: new Date(),
            });
        }
        child.geofences = validatedGeofences;
        yield childRepo.save(child);
        return response_1.ApiResponse.success(res, child.geofences, "Geofences updated");
    }
    catch (error) {
        return response_1.ApiResponse.error(res, error.message);
    }
}));
exports.default = router;
//# sourceMappingURL=geofence.routes.js.map