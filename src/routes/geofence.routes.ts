import { Router } from "express";
import { ApiResponse } from "../utils/response";
import { protectParent } from "../middlewares/auth";
import { AppDataSource } from "../database";
import { ChildEntity } from "../entities/Child";
import { ChildService } from "../services/child.service";
import { GeofenceConfig } from "../types/entities";
import { subscriptionService } from "../services/subscription.service";

const router = Router();
const childRepo = AppDataSource.getRepository(ChildEntity);
const childService = new ChildService();

// Get real geofence analytics
router.get("/analytics/:childId", protectParent, async (req: any, res: any) => {
  try {
    const { childId } = req.params;
    const { startDate, endDate } = req.query;

    const child = await childRepo.findOne({
      where: { id: childId, parent: { id: req.user.id } },
    });
    if (!child) return ApiResponse.error(res, "Child not found", 404);

    const start = startDate ? new Date(String(startDate)) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(String(endDate)) : new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return ApiResponse.error(res, "Invalid date format", 400);
    }
    if (end.getTime() - start.getTime() > 90 * 24 * 60 * 60 * 1000) {
      return ApiResponse.error(res, "Date range cannot exceed 90 days", 400);
    }

    const analytics = await childService.getGeofenceAnalytics(childId, start, end);
    return ApiResponse.success(res, analytics, "Geofence analytics");
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Update geofences for a child
router.put("/:childId", protectParent, async (req: any, res: any) => {
  try {
    const { childId } = req.params;
    const { geofences } = req.body;

    if (!Array.isArray(geofences)) {
      return ApiResponse.error(res, "Geofences must be an array", 400);
    }
    if (geofences.length > 20) {
      return ApiResponse.error(res, "Maximum 20 geofences allowed", 400);
    }

    // Enforce plan geofence limit
    const { allowed, limit } = await subscriptionService.checkLimit(req.user.id, 'maxGeofences');
    if (!allowed || (limit !== Infinity && geofences.length > (limit as number))) {
      const limitLabel = limit === Infinity ? 'unlimited' : String(limit);
      return ApiResponse.error(
        res,
        `Your plan allows ${limitLabel} geofence(s) per child. Upgrade to add more.`,
        403,
      );
    }

    const child = await childRepo.findOne({
      where: { id: childId, parent: { id: req.user.id } },
    });
    if (!child) return ApiResponse.error(res, "Child not found", 404);

    // Validate each geofence with strict bounds checking
    const validatedGeofences: GeofenceConfig[] = [];
    for (let i = 0; i < geofences.length; i++) {
      const g = geofences[i];

      const lat = parseFloat(g.lat);
      const lng = parseFloat(g.lng);
      const radius = parseFloat(g.radius) || 100;

      if (isNaN(lat) || lat < -90 || lat > 90) {
        return ApiResponse.error(res, `Invalid latitude at index ${i}. Must be between -90 and 90.`, 400);
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return ApiResponse.error(res, `Invalid longitude at index ${i}. Must be between -180 and 180.`, 400);
      }
      if (radius < 10 || radius > 50000) {
        return ApiResponse.error(res, `Invalid radius at index ${i}. Must be between 10 and 50000 metres.`, 400);
      }
      if (!g.name || typeof g.name !== "string" || g.name.trim().length === 0) {
        return ApiResponse.error(res, `Missing or invalid name at geofence index ${i}.`, 400);
      }
      if (g.name.length > 100) {
        return ApiResponse.error(res, `Name too long at geofence index ${i}. Maximum 100 characters.`, 400);
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
    await childRepo.save(child);

    return ApiResponse.success(res, child.geofences, "Geofences updated");
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

export default router;
