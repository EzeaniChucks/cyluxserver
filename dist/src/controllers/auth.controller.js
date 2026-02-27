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
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const response_1 = require("../utils/response");
class AuthController {
    constructor() {
        this.authService = new auth_service_1.AuthService();
        this.register = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password, name, referralCode } = req.body;
                if (!email || !password || !name) {
                    return response_1.ApiResponse.error(res, 'Missing registration fields', 400);
                }
                const result = yield this.authService.register({ email, password, name, referralCode });
                return response_1.ApiResponse.success(res, result, 'Account created successfully', 201);
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message, 400);
            }
        });
        this.login = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password } = req.body;
                if (!email || !password) {
                    return response_1.ApiResponse.error(res, 'Email and password required', 400);
                }
                const result = yield this.authService.login(email, password);
                return response_1.ApiResponse.success(res, result, 'Login successful');
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message, 401);
            }
        });
        this.refresh = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { refreshToken } = req.body;
                if (!refreshToken)
                    return response_1.ApiResponse.error(res, 'Refresh token required', 400);
                const tokens = yield this.authService.refresh(refreshToken);
                return response_1.ApiResponse.success(res, tokens, 'Tokens rotated');
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message, 401);
            }
        });
        this.forgotPassword = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { email } = req.body;
                yield this.authService.forgotPassword(email);
                return response_1.ApiResponse.success(res, null, 'If that email exists, a reset link has been sent');
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message);
            }
        });
        this.resetPassword = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { token, password } = req.body;
                yield this.authService.resetPassword(token, password);
                return response_1.ApiResponse.success(res, null, 'Password updated successfully');
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message, 400);
            }
        });
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map