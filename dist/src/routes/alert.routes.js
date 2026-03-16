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
const alert_controller_1 = require("../controllers/alert.controller");
const auth_1 = require("../middlewares/auth");
const child_service_1 = require("../services/child.service");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
const alertController = new alert_controller_1.AlertController();
const childService = new child_service_1.ChildService();
// Parent focused (Protected)
router.get('/alerts', auth_1.protectParent, alertController.getAlerts);
router.get('/logs/:childId', auth_1.protectParent, alertController.getLogs);
// Inbound logs from child devices (protected by device JWT)
router.post('/logs', auth_1.protectChild, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Override childId with the authenticated device ID — prevents logging for other devices
    req.body.childId = req.deviceId;
    return alertController.createLog(req, res);
}));
// High-performance batch ingestion for offline recovery (protected by device JWT)
router.post('/logs/batch', auth_1.protectChild, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { logs } = req.body;
        if (!Array.isArray(logs) || logs.length === 0) {
            return response_1.ApiResponse.error(res, 'Invalid batch format', 400);
        }
        if (logs.length > 500) {
            return response_1.ApiResponse.error(res, 'Batch too large. Maximum 500 logs per request.', 400);
        }
        // Stamp every entry with the authenticated device ID — same as the /logs endpoint
        // does with req.body.childId = req.deviceId. Without this, processLogBatch sees
        // childId=undefined on every entry and the ownership filter drops them all.
        logs = logs.map((l) => (Object.assign(Object.assign({}, l), { childId: req.deviceId })));
        yield childService.processLogBatch(logs, req.deviceId);
        return response_1.ApiResponse.success(res, null, `Ingested batch of logs`);
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message);
    }
}));
exports.default = router;
//# sourceMappingURL=alert.routes.js.map