import { Router } from "express";
import { ParentController } from "../controllers/parent.controller";
import { PairingService } from "../services/pairing.service";
import { ApiResponse } from "../utils/response";
import { protectParent } from "../middlewares/auth";
import { parentReferralService } from "../services/parentReferral.service";
import { AppDataSource } from "../database";
import { ChildEntity } from "../entities/Child";
import { RewardEntity } from "../entities/Reward";
import { subscriptionService } from "../services/subscription.service";
import { ChildService, deviceLocalDateString } from "../services/child.service";

const router = Router();
const parentController = new ParentController();
const pairingService = new PairingService();
const childRepo = AppDataSource.getRepository(ChildEntity);
const rewardRepo = AppDataSource.getRepository(RewardEntity);

router.use(protectParent);

router.get("/me", parentController.getMe);
router.get("/dashboard", parentController.getDashboard);
router.patch("/me", parentController.updateMe);

router.post("/children/:childId/pairing-code", async (req: any, res: any) => {
  try {
    const { childId } = req.params;
    const pairing = await pairingService.regeneratePairingCodeForChild(req.user.id, childId);
    return ApiResponse.success(res, pairing, "Pairing code generated");
  } catch (e: any) {
    const status = e.message === 'Child not found' || e.message === 'Not authorized' ? 404 : 500;
    return ApiResponse.error(res, e.message, status);
  }
});

router.post("/pairing-code", async (req: any, res: any) => {
  try {
    const { childName } = req.body || {};
    if (!childName || typeof childName !== 'string' || !childName.trim())
      return ApiResponse.error(res, "Child name is required", 400);
    const pairing = await pairingService.createPairingCode(
      req.user.id,
      childName.trim()
    );
    return ApiResponse.success(res, pairing, "Pairing code generated");
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

// --- Delete child device ---
router.delete("/children/:childId", async (req: any, res: any) => {
  try {
    const childService = new ChildService();
    await childService.deleteChild(req.params.childId, req.user.id);
    return ApiResponse.success(res, null, "Child device removed");
  } catch (e: any) {
    const status = e.message.includes("not found") || e.message.includes("not authorized") ? 404 : 500;
    return ApiResponse.error(res, e.message, status);
  }
});

// --- Single child detail (parent-scoped, includes appUsage) ---
router.get("/children/:childId", async (req: any, res: any) => {
  try {
    const child = await childRepo.findOne({
      where: { id: req.params.childId, parent: { id: req.user.id } as any },
    });
    if (!child) return ApiResponse.error(res, "Child not found", 404);
    return ApiResponse.success(res, child);
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

// --- Reward system ---
// POST: grant bonus screen time to a child
router.post("/children/:childId/rewards", async (req: any, res: any) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.id;
    const { minutes, reason } = req.body;

    if (typeof minutes !== "number" || minutes <= 0 || minutes > 480) {
      return ApiResponse.error(res, "minutes must be a number between 1 and 480", 400);
    }

    const child = await childRepo.findOne({
      where: { id: childId, parent: { id: parentId } as any },
    });
    if (!child) return ApiResponse.error(res, "Child not found", 404);

    const reward = rewardRepo.create({
      parentId,
      childId,
      minutes,
      reason: reason?.toString().slice(0, 200) || null,
      claimed: false,
    });
    await rewardRepo.save(reward);

    return ApiResponse.success(res, reward, "Reward granted");
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

// GET: list recent rewards for a child (parent view)
router.get("/children/:childId/rewards", async (req: any, res: any) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.id;

    const child = await childRepo.findOne({
      where: { id: childId, parent: { id: parentId } as any },
    });
    if (!child) return ApiResponse.error(res, "Child not found", 404);

    const rewards = await rewardRepo.find({
      where: { childId, parentId },
      order: { createdAt: "DESC" },
      take: 50,
    });
    return ApiResponse.success(res, rewards);
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

// --- Usage history (weekly / monthly) — enterprise only ---
// Returns aggregated app-usage history for the last 7 or 30 days.
// Today's live appUsage is merged under the current date key.
router.get("/children/:childId/usage-history", async (req: any, res: any) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.id;
    const rawPeriod = parseInt(String(req.query.period || "7"), 10);
    const period: 7 | 30 = rawPeriod === 30 ? 30 : 7;

    const { allowed } = await subscriptionService.checkLimit(parentId, "advancedReports");
    if (!allowed) {
      return ApiResponse.error(
        res,
        "Usage history reports require a Premium Plus plan or higher. Upgrade to access this feature.",
        403,
      );
    }

    const child = await childRepo.findOne({
      where: { id: childId, parent: { id: parentId } as any },
    });
    if (!child) return ApiResponse.error(res, "Child not found", 404);

    const history: Record<string, any[]> =
      typeof child.usageHistory === "object" && child.usageHistory
        ? { ...(child.usageHistory as Record<string, any[]>) }
        : {};

    // Merge today's live appUsage under today's date key using device-local timezone
    // so the date matches the stored snapshot keys (which are also device-local).
    const childTz = child.timezone ?? null;
    const todayKey = deviceLocalDateString(new Date(), childTz);
    if (Array.isArray(child.appUsage)) {
      const usedToday = (child.appUsage as any[]).filter((a) => a.timeSpentMinutes > 0);
      if (usedToday.length > 0) history[todayKey] = usedToday;
    }

    // Filter to the requested period using device-local dates
    const result: Record<string, any[]> = {};
    for (let i = 0; i < period; i++) {
      // Step back i days from today in device-local time by subtracting ms
      const d = new Date(Date.now() - i * 86_400_000);
      const key = deviceLocalDateString(d, childTz);
      if (history[key]) result[key] = history[key];
    }

    return ApiResponse.success(res, { period, history: result });
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

// Referral program
router.get("/referral", async (req: any, res: any) => {
  try {
    const stats = await parentReferralService.getStats(req.user.id);
    return ApiResponse.success(res, stats, "Referral stats");
  } catch (e: any) {
    return ApiResponse.error(res, e.message);
  }
});

export default router;
