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
const influencer_controller_1 = require("../controllers/influencer.controller");
const auth_1 = require("../middlewares/auth");
const wallet_service_1 = require("../services/wallet.service");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
// ── Public ──────────────────────────────────────────────────────────────────
router.get('/validate/:code', influencer_controller_1.influencerController.validateCode);
router.post('/auth/login', influencer_controller_1.influencerController.login);
// ── Protected (influencer token required) ───────────────────────────────────
router.get('/dashboard', auth_1.protectInfluencer, influencer_controller_1.influencerController.getDashboard);
router.get('/referrals', auth_1.protectInfluencer, influencer_controller_1.influencerController.getReferrals);
router.patch('/profile', auth_1.protectInfluencer, influencer_controller_1.influencerController.updateProfile);
// ── Wallet (mounted here so influencerApi base /api/influencer aligns) ───────
router.get('/wallet', auth_1.protectInfluencer, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wallet = yield wallet_service_1.walletService.getWalletSummary(req.influencer.id, 'influencer');
        return response_1.ApiResponse.success(res, wallet, 'Wallet');
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message);
    }
}));
router.get('/wallet/transactions', auth_1.protectInfluencer, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page, limit } = req.query;
        const result = yield wallet_service_1.walletService.getTransactions(req.influencer.id, 'influencer', page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
        return response_1.ApiResponse.success(res, result, 'Transactions');
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message);
    }
}));
router.post('/wallet/connect', auth_1.protectInfluencer, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { returnUrl, refreshUrl } = req.body;
        if (!returnUrl || !refreshUrl)
            return response_1.ApiResponse.error(res, 'returnUrl and refreshUrl required', 400);
        const url = yield wallet_service_1.walletService.getConnectOnboardingUrl(req.influencer.id, 'influencer', req.influencer.email, returnUrl, refreshUrl);
        return response_1.ApiResponse.success(res, { url }, 'Onboarding URL');
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message);
    }
}));
router.post('/wallet/withdraw', auth_1.protectInfluencer, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amountUsd } = req.body;
        if (!amountUsd || isNaN(parseFloat(amountUsd))) {
            return response_1.ApiResponse.error(res, 'Valid amountUsd required', 400);
        }
        const tx = yield wallet_service_1.walletService.withdraw(req.influencer.id, 'influencer', parseFloat(amountUsd));
        return response_1.ApiResponse.success(res, tx, 'Withdrawal initiated');
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
exports.default = router;
//# sourceMappingURL=influencer.routes.js.map