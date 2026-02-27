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
exports.influencerController = exports.InfluencerController = void 0;
const influencer_service_1 = require("../services/influencer.service");
const response_1 = require("../utils/response");
class InfluencerController {
    constructor() {
        // ─── Public ───────────────────────────────────────────────────────────────
        this.validateCode = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { code } = req.params;
                if (!code)
                    return response_1.ApiResponse.error(res, 'Code is required', 400);
                const result = yield influencer_service_1.influencerService.validateCode(code);
                if (!result)
                    return response_1.ApiResponse.success(res, { valid: false }, 'Invalid or inactive code');
                return response_1.ApiResponse.success(res, result, 'Code validated');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        // ─── Auth ─────────────────────────────────────────────────────────────────
        this.login = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password } = req.body;
                if (!email || !password)
                    return response_1.ApiResponse.error(res, 'Email and password required', 400);
                const result = yield influencer_service_1.influencerService.login(email, password);
                return response_1.ApiResponse.success(res, result, 'Login successful');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message, 401);
            }
        });
        // ─── Protected (influencer self-serve) ───────────────────────────────────
        this.getDashboard = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const dashboard = yield influencer_service_1.influencerService.getDashboard(req.influencer.id);
                return response_1.ApiResponse.success(res, dashboard, 'Dashboard data');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.getReferrals = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const referrals = yield influencer_service_1.influencerService.getReferrals(req.influencer.id);
                // Mask referred user emails for privacy
                const masked = referrals.map(r => (Object.assign(Object.assign({}, r), { referredParent: r.referredParent
                        ? { id: r.referredParent.id, email: r.referredParent.email.replace(/(.{2}).*(@.*)/, '$1***$2') }
                        : null })));
                return response_1.ApiResponse.success(res, masked, 'Referrals');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.updateProfile = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, password } = req.body;
                yield influencer_service_1.influencerService.updateProfile(req.influencer.id, { name, password });
                return response_1.ApiResponse.success(res, null, 'Profile updated');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message, 400);
            }
        });
    }
}
exports.InfluencerController = InfluencerController;
exports.influencerController = new InfluencerController();
//# sourceMappingURL=influencer.controller.js.map