import { Router } from "express";
import { protectParent } from "../middlewares/auth";
import { networkController } from "../controllers/network.controller";

const router = Router();

router.use(protectParent);

// GET  /api/network/profile
router.get("/profile", networkController.getProfile);

// PUT  /api/network/profile
router.put("/profile", networkController.updateProfile);

// POST /api/network/profile/test
router.post("/profile/test", networkController.testConnection);

// POST /api/network/profile/create-nextdns
router.post("/profile/create-nextdns", networkController.createNextDnsProfile);

// POST /api/network/profile/sync
router.post("/profile/sync", networkController.syncDomains);

// GET  /api/network/profile/setup-instructions
router.get(
  "/profile/setup-instructions",
  networkController.getSetupInstructions
);

export default router;
