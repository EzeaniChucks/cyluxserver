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
const database_1 = require("../database");
const Child_1 = require("../entities/Child");
const Reward_1 = require("../entities/Reward");
const router = (0, express_1.Router)();
const parentController = new parent_controller_1.ParentController();
const pairingService = new pairing_service_1.PairingService();
const childRepo = database_1.AppDataSource.getRepository(Child_1.ChildEntity);
const rewardRepo = database_1.AppDataSource.getRepository(Reward_1.RewardEntity);
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
// --- Single child detail (parent-scoped, includes appUsage) ---
router.get("/children/:childId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const child = yield childRepo.findOne({
            where: { id: req.params.childId, parent: { id: req.user.id } },
        });
        if (!child)
            return response_1.ApiResponse.error(res, "Child not found", 404);
        return response_1.ApiResponse.success(res, child);
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message);
    }
}));
// --- Reward system ---
// POST: grant bonus screen time to a child
router.post("/children/:childId/rewards", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { childId } = req.params;
        const parentId = req.user.id;
        const { minutes, reason } = req.body;
        if (typeof minutes !== "number" || minutes <= 0 || minutes > 480) {
            return response_1.ApiResponse.error(res, "minutes must be a number between 1 and 480", 400);
        }
        const child = yield childRepo.findOne({
            where: { id: childId, parent: { id: parentId } },
        });
        if (!child)
            return response_1.ApiResponse.error(res, "Child not found", 404);
        const reward = rewardRepo.create({
            parentId,
            childId,
            minutes,
            reason: (reason === null || reason === void 0 ? void 0 : reason.toString().slice(0, 200)) || null,
            claimed: false,
        });
        yield rewardRepo.save(reward);
        return response_1.ApiResponse.success(res, reward, "Reward granted");
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message);
    }
}));
// GET: list recent rewards for a child (parent view)
router.get("/children/:childId/rewards", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { childId } = req.params;
        const parentId = req.user.id;
        const child = yield childRepo.findOne({
            where: { id: childId, parent: { id: parentId } },
        });
        if (!child)
            return response_1.ApiResponse.error(res, "Child not found", 404);
        const rewards = yield rewardRepo.find({
            where: { childId, parentId },
            order: { createdAt: "DESC" },
            take: 50,
        });
        return response_1.ApiResponse.success(res, rewards);
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