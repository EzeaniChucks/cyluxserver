import { Router } from "express";
import { ParentController } from "../controllers/parent.controller";
import { PairingService } from "../services/pairing.service";
import { ApiResponse } from "../utils/response";
import { protectParent } from "../middlewares/auth";
import { parentReferralService } from "../services/parentReferral.service";

const router = Router();
const parentController = new ParentController();
const pairingService = new PairingService();

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
