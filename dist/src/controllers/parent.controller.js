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
exports.ParentController = void 0;
const parent_service_1 = require("../services/parent.service");
const response_1 = require("../utils/response");
class ParentController {
    constructor() {
        this.parentService = new parent_service_1.ParentService();
        // Fixed: Changed req type to any for compatibility with Express Router signatures
        this.getMe = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const parentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!parentId)
                    return response_1.ApiResponse.error(res, 'Unauthorized', 401);
                const profile = yield this.parentService.getParentProfile(parentId);
                return response_1.ApiResponse.success(res, profile);
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message);
            }
        });
        // Fixed: Changed req type to any for compatibility with Express Router signatures
        this.getDashboard = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const parentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!parentId)
                    return response_1.ApiResponse.error(res, 'Unauthorized', 401);
                const summary = yield this.parentService.getDashboardSummary(parentId);
                return response_1.ApiResponse.success(res, summary, 'Dashboard data synced');
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message);
            }
        });
        // Fixed: Changed req type to any to avoid property access errors (body) with custom AuthenticatedRequest
        this.updateMe = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const parentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!parentId)
                    return response_1.ApiResponse.error(res, 'Unauthorized', 401);
                const updatedProfile = yield this.parentService.updateProfile(parentId, req.body);
                return response_1.ApiResponse.success(res, updatedProfile, 'Profile updated');
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message);
            }
        });
    }
}
exports.ParentController = ParentController;
//# sourceMappingURL=parent.controller.js.map