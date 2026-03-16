"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const network_controller_1 = require("../controllers/network.controller");
const router = (0, express_1.Router)();
router.use(auth_1.protectParent);
// GET  /api/network/profile
router.get("/profile", network_controller_1.networkController.getProfile);
// PUT  /api/network/profile
router.put("/profile", network_controller_1.networkController.updateProfile);
// POST /api/network/profile/test
router.post("/profile/test", network_controller_1.networkController.testConnection);
// POST /api/network/profile/create-nextdns
router.post("/profile/create-nextdns", network_controller_1.networkController.createNextDnsProfile);
// POST /api/network/profile/sync
router.post("/profile/sync", network_controller_1.networkController.syncDomains);
// GET  /api/network/profile/setup-instructions
router.get("/profile/setup-instructions", network_controller_1.networkController.getSetupInstructions);
exports.default = router;
//# sourceMappingURL=network.routes.js.map