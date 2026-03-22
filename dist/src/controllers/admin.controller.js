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
exports.adminController = exports.AdminController = void 0;
const admin_service_1 = require("../services/admin.service");
const influencer_service_1 = require("../services/influencer.service");
const parentReferral_service_1 = require("../services/parentReferral.service");
const wallet_service_1 = require("../services/wallet.service");
const system_config_service_1 = require("../services/system-config.service");
const response_1 = require("../utils/response");
class AdminController {
    constructor() {
        // ─── Auth ─────────────────────────────────────────────────────────────────
        this.seed = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Require a server-side secret so this endpoint cannot be called by strangers.
                // Set ADMIN_SEED_SECRET in .env before running the seed for the first time.
                const seedSecret = process.env.ADMIN_SEED_SECRET;
                if (!seedSecret)
                    return response_1.ApiResponse.error(res, 'Seed endpoint is disabled (ADMIN_SEED_SECRET not configured)', 503);
                if (req.headers['x-seed-secret'] !== seedSecret) {
                    return response_1.ApiResponse.error(res, 'Forbidden', 403);
                }
                const { email, password, name } = req.body;
                if (!email || !password || !name)
                    return response_1.ApiResponse.error(res, 'Missing fields', 400);
                const admin = yield admin_service_1.adminService.seedFirstAdmin({ email, password, name });
                return response_1.ApiResponse.success(res, { id: admin.id, email: admin.email }, 'Superadmin created', 201);
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message, 400);
            }
        });
        this.login = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password } = req.body;
                if (!email || !password)
                    return response_1.ApiResponse.error(res, 'Email and password required', 400);
                const result = yield admin_service_1.adminService.login(email, password);
                return response_1.ApiResponse.success(res, result, 'Login successful');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message, 401);
            }
        });
        // ─── Stats ────────────────────────────────────────────────────────────────
        this.getStats = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield admin_service_1.adminService.getPlatformStats();
                return response_1.ApiResponse.success(res, stats, 'Platform stats');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        // ─── Parents ──────────────────────────────────────────────────────────────
        this.getParents = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { page, limit, search, plan, status } = req.query;
                const result = yield admin_service_1.adminService.getParents({
                    page: page ? parseInt(String(page)) : undefined,
                    limit: limit ? parseInt(String(limit)) : undefined,
                    search: search ? String(search) : undefined,
                    plan: plan ? String(plan) : undefined,
                    status: status ? String(status) : undefined,
                });
                return response_1.ApiResponse.success(res, result, 'Parents list');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.getParent = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const parent = yield admin_service_1.adminService.getParentById(req.params.id);
                if (!parent)
                    return response_1.ApiResponse.error(res, 'Parent not found', 404);
                return response_1.ApiResponse.success(res, parent, 'Parent details');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.updateParent = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const parent = yield admin_service_1.adminService.updateParent(req.params.id, req.body);
                return response_1.ApiResponse.success(res, parent, 'Parent updated');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.overrideSubscription = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const sub = yield admin_service_1.adminService.overrideSubscription(req.params.id, req.body, req.admin.id);
                return response_1.ApiResponse.success(res, sub, 'Subscription updated');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.deleteParent = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield admin_service_1.adminService.deleteParent(req.params.id);
                return response_1.ApiResponse.success(res, null, 'Parent deleted');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        // ─── Subscriptions ────────────────────────────────────────────────────────
        this.getSubscriptions = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { page, limit, plan, status } = req.query;
                const result = yield admin_service_1.adminService.getSubscriptions({
                    page: page ? parseInt(String(page)) : undefined,
                    limit: limit ? parseInt(String(limit)) : undefined,
                    plan: plan ? String(plan) : undefined,
                    status: status ? String(status) : undefined,
                });
                return response_1.ApiResponse.success(res, result, 'Subscriptions list');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        // ─── Plan Configs ─────────────────────────────────────────────────────────
        this.getPlans = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const plans = yield admin_service_1.adminService.getPlanConfigs();
                return response_1.ApiResponse.success(res, plans, 'Plan configs');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.updatePlan = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const plan = yield admin_service_1.adminService.updatePlanConfig(req.params.planId, req.body, req.admin.id);
                return response_1.ApiResponse.success(res, plan, 'Plan updated');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.createPlan = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { planId, name, description, price, stripePriceId, stripePriceIdAnnual, contactSalesOnly, maxDevices, maxGeofences, vpnFiltering, realTimeAlerts, smartTv, advancedReports, schoolDashboard, trialDays, } = req.body;
                if (!planId || !name || !description || maxDevices === undefined || maxGeofences === undefined) {
                    return response_1.ApiResponse.error(res, 'planId, name, description, maxDevices, and maxGeofences are required', 400);
                }
                const plan = yield admin_service_1.adminService.createPlanConfig({
                    planId, name, description, price, stripePriceId, stripePriceIdAnnual,
                    contactSalesOnly, maxDevices, maxGeofences,
                    vpnFiltering: vpnFiltering !== null && vpnFiltering !== void 0 ? vpnFiltering : false,
                    realTimeAlerts: realTimeAlerts !== null && realTimeAlerts !== void 0 ? realTimeAlerts : false,
                    smartTv: smartTv !== null && smartTv !== void 0 ? smartTv : false,
                    advancedReports: advancedReports !== null && advancedReports !== void 0 ? advancedReports : false,
                    schoolDashboard: schoolDashboard !== null && schoolDashboard !== void 0 ? schoolDashboard : false,
                    trialDays,
                }, req.admin.id);
                return response_1.ApiResponse.success(res, plan, 'Plan created', 201);
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message, 400);
            }
        });
        this.deactivatePlan = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const plan = yield admin_service_1.adminService.deactivatePlanConfig(req.params.planId, req.admin.id);
                return response_1.ApiResponse.success(res, plan, 'Plan deactivated');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message, 400);
            }
        });
        // ─── Influencers ──────────────────────────────────────────────────────────
        this.getInfluencers = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const list = yield influencer_service_1.influencerService.getInfluencers();
                return response_1.ApiResponse.success(res, list, 'Influencers');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.createInfluencer = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, email, password, code, discountPercent, rewardType, rewardValue } = req.body;
                if (!name || !email || !password || !code) {
                    return response_1.ApiResponse.error(res, 'name, email, password, and code are required', 400);
                }
                const influencer = yield influencer_service_1.influencerService.createInfluencer({
                    name, email, password, code, discountPercent, rewardType, rewardValue,
                });
                return response_1.ApiResponse.success(res, influencer, 'Influencer created', 201);
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message, 400);
            }
        });
        this.updateInfluencer = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const influencer = yield influencer_service_1.influencerService.updateInfluencer(req.params.id, req.body);
                return response_1.ApiResponse.success(res, influencer, 'Influencer updated');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.deleteInfluencer = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield influencer_service_1.influencerService.deactivateInfluencer(req.params.id);
                return response_1.ApiResponse.success(res, null, 'Influencer deactivated');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.getInfluencerReferrals = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const referrals = yield influencer_service_1.influencerService.getReferrals(req.params.id);
                return response_1.ApiResponse.success(res, referrals, 'Referrals');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.markRewardPaid = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const referral = yield influencer_service_1.influencerService.markRewardPaid(req.params.id);
                return response_1.ApiResponse.success(res, referral, 'Reward marked as paid');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        // ─── Parent Referral Config ───────────────────────────────────────────────
        this.getParentReferralConfig = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const config = yield parentReferral_service_1.parentReferralService.getConfig();
                return response_1.ApiResponse.success(res, config, 'Parent referral config');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.updateParentReferralConfig = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { isEnabled, rewardType, rewardValue, referredDiscountPercent } = req.body;
                const config = yield parentReferral_service_1.parentReferralService.updateConfig({ isEnabled, rewardType, rewardValue, referredDiscountPercent }, req.admin.id);
                return response_1.ApiResponse.success(res, config, 'Parent referral config updated');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        // ─── Revenue ──────────────────────────────────────────────────────────────
        this.getRevenue = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const revenue = yield admin_service_1.adminService.getRevenue();
                return response_1.ApiResponse.success(res, revenue, 'Revenue metrics');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        // ─── Payout Config ────────────────────────────────────────────────────────
        this.getPayoutConfig = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const config = yield wallet_service_1.walletService.getPayoutConfig();
                return response_1.ApiResponse.success(res, config, 'Payout config');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.updatePayoutConfig = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { minWithdrawalUsdInfluencer, minWithdrawalUsdParent, holdDays } = req.body;
                const config = yield wallet_service_1.walletService.updatePayoutConfig({ minWithdrawalUsdInfluencer, minWithdrawalUsdParent, holdDays }, req.admin.id);
                return response_1.ApiResponse.success(res, config, 'Payout config updated');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        // ─── Wallets overview ─────────────────────────────────────────────────────
        this.getWallets = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { page, limit, ownerType } = req.query;
                const result = yield wallet_service_1.walletService.getAllWallets(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20, ownerType);
                return response_1.ApiResponse.success(res, result, 'Wallets');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.getWithdrawals = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { page, limit } = req.query;
                const result = yield wallet_service_1.walletService.getWithdrawalHistory(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
                return response_1.ApiResponse.success(res, result, 'Withdrawal history');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        // ─── System Config ────────────────────────────────────────────────────────
        this.getSystemConfig = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const config = yield system_config_service_1.systemConfigService.getConfig();
                // Never expose the raw key — mask it
                return response_1.ApiResponse.success(res, {
                    claudeKeyConfigured: !!config.claudeApiKey,
                    claudeKeyStatus: config.claudeKeyStatus,
                    claudeKeyLastError: config.claudeKeyLastError,
                    updatedAt: config.updatedAt,
                }, 'System config');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.updateSystemConfig = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { claudeApiKey } = req.body;
                yield system_config_service_1.systemConfigService.updateConfig({ claudeApiKey });
                return response_1.ApiResponse.success(res, null, 'System config updated');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
    }
}
exports.AdminController = AdminController;
exports.adminController = new AdminController();
//# sourceMappingURL=admin.controller.js.map