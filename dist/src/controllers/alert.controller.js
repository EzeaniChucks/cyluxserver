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
exports.AlertController = void 0;
const alert_service_1 = require("../services/alert.service");
const response_1 = require("../utils/response");
class AlertController {
    constructor() {
        this.alertService = new alert_service_1.AlertService();
        this.getAlerts = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const parentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!parentId)
                    return response_1.ApiResponse.error(res, 'Unauthorized', 401);
                const { page = 1, limit = 50 } = req.query;
                const result = yield this.alertService.getAllAlerts(parentId, Number(page), Number(limit));
                return response_1.ApiResponse.success(res, result);
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message);
            }
        });
        this.getLogs = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { childId } = req.params;
                const parentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!parentId)
                    return response_1.ApiResponse.error(res, 'Unauthorized', 401);
                const { page = 1, limit = 100, actionType } = req.query;
                const result = yield this.alertService.getLogsByChildId(childId, parentId, Number(page), Number(limit), typeof actionType === 'string' ? actionType : undefined);
                return response_1.ApiResponse.success(res, result);
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message);
            }
        });
        this.createLog = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const log = yield this.alertService.createLog(req.body);
                if (!log)
                    return response_1.ApiResponse.error(res, 'Log rejected: invalid data or unenrolled device', 400);
                return response_1.ApiResponse.success(res, log, 'Log recorded', 201);
            }
            catch (error) {
                return response_1.ApiResponse.error(res, error.message);
            }
        });
    }
}
exports.AlertController = AlertController;
//# sourceMappingURL=alert.controller.js.map