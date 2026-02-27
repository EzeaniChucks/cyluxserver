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
const auth_1 = require("../middlewares/auth");
const wallet_service_1 = require("../services/wallet.service");
const response_1 = require("../utils/response");
const database_1 = require("../database");
const Subscription_1 = require("../entities/Subscription");
const router = (0, express_1.Router)();
// ── Parent wallet ────────────────────────────────────────────────────────────
router.get('/parent', auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wallet = yield wallet_service_1.walletService.getWalletSummary(req.user.id, 'parent');
        return response_1.ApiResponse.success(res, wallet, 'Wallet');
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message);
    }
}));
router.get('/parent/transactions', auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page, limit } = req.query;
        const result = yield wallet_service_1.walletService.getTransactions(req.user.id, 'parent', page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
        return response_1.ApiResponse.success(res, result, 'Transactions');
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message);
    }
}));
router.post('/parent/connect', auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { returnUrl, refreshUrl } = req.body;
        if (!returnUrl || !refreshUrl)
            return response_1.ApiResponse.error(res, 'returnUrl and refreshUrl required', 400);
        const url = yield wallet_service_1.walletService.getConnectOnboardingUrl(req.user.id, 'parent', req.user.email, returnUrl, refreshUrl);
        return response_1.ApiResponse.success(res, { url }, 'Onboarding URL');
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message);
    }
}));
router.post('/parent/withdraw', auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amountUsd } = req.body;
        if (!amountUsd || isNaN(parseFloat(amountUsd))) {
            return response_1.ApiResponse.error(res, 'Valid amountUsd required', 400);
        }
        const tx = yield wallet_service_1.walletService.withdraw(req.user.id, 'parent', parseFloat(amountUsd));
        return response_1.ApiResponse.success(res, tx, 'Withdrawal initiated');
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
router.post('/parent/apply-credit', auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amountUsd } = req.body;
        if (!amountUsd || isNaN(parseFloat(amountUsd))) {
            return response_1.ApiResponse.error(res, 'Valid amountUsd required', 400);
        }
        // Look up the parent's Stripe customer ID from their subscription
        const subRepo = database_1.AppDataSource.getRepository(Subscription_1.SubscriptionEntity);
        const sub = yield subRepo.findOne({ where: { parentId: req.user.id } });
        if (!(sub === null || sub === void 0 ? void 0 : sub.stripeCustomerId)) {
            return response_1.ApiResponse.error(res, 'No active subscription found', 400);
        }
        yield wallet_service_1.walletService.applyBillingCredit(req.user.id, 'parent', parseFloat(amountUsd), sub.stripeCustomerId);
        return response_1.ApiResponse.success(res, null, 'Billing credit applied');
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
exports.default = router;
//# sourceMappingURL=wallet.routes.js.map