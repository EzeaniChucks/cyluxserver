import { Router } from "express";
import { ParentController } from "../controllers/parent.controller";
import { PairingService } from "../services/pairing.service";
import { ApiResponse } from "../utils/response";
import { protectParent } from "../middlewares/auth";
import { parentReferralService } from "../services/parentReferral.service";
import { AppDataSource } from "../database";
import { ChildEntity } from "../entities/Child";
import { RewardEntity } from "../entities/Reward";

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
