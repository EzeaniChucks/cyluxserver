import { Router } from "express";
import { ChildController } from "../controllers/child.controller";
import { PairingService } from "../services/pairing.service";
import { ApiResponse } from "../utils/response";
import { protectParent, protectChild } from "../middlewares/auth";
import { pairingLimiter } from "../middlewares/rateLimiter";
import { subscriptionService } from "../services/subscription.service";
import { AppDataSource } from "../database";
import { ChildEntity } from "../entities/Child";
import { RewardEntity } from "../entities/Reward";

const router = Router();
const childController = new ChildController();
const pairingService = new PairingService();
const childRepo = AppDataSource.getRepository(ChildEntity);
const rewardRepo = AppDataSource.getRepository(RewardEntity);

// --- Parent Controlled Routes ---
router.get("/", protectParent, childController.getChildren);
router.patch("/:id", protectParent, childController.updateChild);
router.post("/:id/command", protectParent, childController.triggerCommand);

// Time extension request (child → parent flow)
router.get("/:childId/time-request", protectParent, childController.getPendingTimeRequest);
router.post("/:childId/time-request/respond", protectParent, childController.respondTimeRequest);

// Installed app list (for parent app-picker UI)
router.get("/:childId/apps", protectParent, childController.getInstalledApps);

// --- Device Pairing (rate-limited, unauthenticated — issues the device JWT) ---
router.post("/pair", pairingLimiter, async (req: any, res: any) => {
  try {
    const { code, deviceId, deviceType } = req.body;

    // Input validation
    if (!code || !/^\d{6}$/.test(String(code))) {
      return ApiResponse.error(res, "Invalid pairing code format. Must be 6 digits.", 400);
    }
    if (!deviceId || typeof deviceId !== "string" || deviceId.trim().length === 0 || deviceId.length > 255) {
      return ApiResponse.error(res, "Invalid device ID.", 400);
    }
    const validDeviceTypes = ["ios", "android", "android_tv", "tvos"];
    if (deviceType && !validDeviceTypes.includes(deviceType)) {
      return ApiResponse.error(res, "Invalid device type. Must be 'ios', 'android', 'android_tv', or 'tvos'.", 400);
    }

    // Resolve the parentId from the pairing code before checking limits
    const pairing = await pairingService.findByCode(code);
    if (!pairing) {
      return ApiResponse.error(res, "Invalid or expired pairing code", 400);
    }

    // Enforce plan device limit before completing pairing.
    // Skip the check for re-enrollments — the device already occupies a slot.
    const isReenrollment = await childRepo.findOne({
      where: { id: deviceId.trim(), parent: { id: pairing.parentId }, isEnrolled: true },
    });
    if (!isReenrollment) {
      const enrolledCount = await childRepo.count({
        where: { parent: { id: pairing.parentId }, isEnrolled: true },
      });
      const { allowed, limit } = await subscriptionService.checkLimit(pairing.parentId, 'maxDevices');
      if (!allowed || (limit !== Infinity && enrolledCount >= (limit as number))) {
        const limitLabel = limit === Infinity ? 'unlimited' : String(limit);
        return ApiResponse.error(
          res,
          `Your plan allows ${limitLabel} device(s). Upgrade to add more.`,
          403,
        );
      }
    }

    const result = await pairingService.pairDevice(code, deviceId.trim(), deviceType);
    return ApiResponse.success(res, { child: result.child, deviceToken: result.deviceToken }, "Device successfully paired");
  } catch (e: any) {
    return ApiResponse.error(res, e.message, 400);
  }
});

// --- Child Device Routes (all protected by device JWT) ---

// GET /children/:childId — device policy fetch.
// Used by checkPairing (verify device is still enrolled) and initializePolicy
// (LockScreen JS polling on iOS where no native background service is available).
router.get("/:childId", protectChild, childController.getDevicePolicy);

router.post("/:childId/heartbeat", protectChild, childController.heartbeat);
router.post("/:childId/command/:commandId/ack", protectChild, childController.acknowledgeCommand);

// Claim all pending reward minutes (child initiates from lock screen)
router.post("/:childId/rewards/claim", protectChild, async (req: any, res: any) => {
  try {
    const { childId } = req.params;
    const authenticatedDeviceId = req.deviceId;

    if (childId !== authenticatedDeviceId) {
      return ApiResponse.error(res, "Unauthorized", 403);
    }

    const unclaimed = await rewardRepo.find({ where: { childId, claimed: false } });
    if (!unclaimed.length) {
      return ApiResponse.success(res, { minutes: 0 }, "No pending rewards");
    }

    const totalMinutes = unclaimed.reduce((sum, r) => sum + r.minutes, 0);
    const now = new Date();

    // Mark all rewards claimed
    await Promise.all(
      unclaimed.map((r) => rewardRepo.update(r.id, { claimed: true, claimedAt: now }))
    );

    // Extend daily limit and unlock if previously paused due to limit
    const child = await childRepo.findOne({ where: { id: childId } });
    if (child) {
      const newLimit = child.dailyLimitMinutes + totalMinutes;
      const wasAtLimit = child.usedMinutes >= child.dailyLimitMinutes;
      await childRepo.update(childId, {
        dailyLimitMinutes: newLimit,
        ...(wasAtLimit ? { status: "active" } : {}),
      });
      return ApiResponse.success(
        res,
        { minutes: totalMinutes, newDailyLimitMinutes: newLimit },
        `${totalMinutes} bonus minutes claimed`,
      );
    }

    return ApiResponse.success(res, { minutes: totalMinutes }, "Rewards claimed");
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

export default router;
