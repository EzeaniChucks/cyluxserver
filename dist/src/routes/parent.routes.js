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
const parent_controller_1 = require("../controllers/parent.controller");
const pairing_service_1 = require("../services/pairing.service");
const response_1 = require("../utils/response");
const auth_1 = require("../middlewares/auth");
const parentReferral_service_1 = require("../services/parentReferral.service");
const router = (0, express_1.Router)();
const parentController = new parent_controller_1.ParentController();
const pairingService = new pairing_service_1.PairingService();
router.use(auth_1.protectParent);
router.get("/me", parentController.getMe);
router.get("/dashboard", parentController.getDashboard);
router.patch("/me", parentController.updateMe);
router.post("/children/:childId/pairing-code", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { childId } = req.params;
        const pairing = yield pairingService.regeneratePairingCodeForChild(req.user.id, childId);
        return response_1.ApiResponse.success(res, pairing, "Pairing code generated");
    }
    catch (e) {
        const status = e.message === 'Child not found' || e.message === 'Not authorized' ? 404 : 500;
        return response_1.ApiResponse.error(res, e.message, status);
    }
}));
router.post("/pairing-code", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { childName } = req.body || {};
        if (!childName || typeof childName !== 'string' || !childName.trim())
            return response_1.ApiResponse.error(res, "Child name is required", 400);
        const pairing = yield pairingService.createPairingCode(req.user.id, childName.trim());
        return response_1.ApiResponse.success(res, pairing, "Pairing code generated");
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message);
    }
}));
// Referral program
router.get("/referral", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield parentReferral_service_1.parentReferralService.getStats(req.user.id);
        return response_1.ApiResponse.success(res, stats, "Referral stats");
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message);
    }
}));
exports.default = router;
//# sourceMappingURL=parent.routes.js.map