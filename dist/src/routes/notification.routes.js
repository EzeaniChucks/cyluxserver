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
const notification_service_1 = require("../services/notification.service");
const response_1 = require("../utils/response");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const notificationService = new notification_service_1.NotificationService();
// Fixed: Changed req type to any to avoid signature mismatch and property access errors
router.post('/register-parent', auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { token, deviceType } = req.body;
        if (!token || !deviceType)
            return response_1.ApiResponse.error(res, 'Token and deviceType are required', 400);
        const parentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!parentId)
            return response_1.ApiResponse.error(res, 'Unauthorized', 401);
        yield notificationService.registerToken(parentId, token, 'parent', deviceType);
        return response_1.ApiResponse.success(res, null, 'Parent token and device info registered');
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message);
    }
}));
// Fixed: Changed req type to any to avoid signature mismatch and property access errors
router.post('/register-child', auth_1.protectChild, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, deviceType } = req.body;
        if (!token || !deviceType)
            return response_1.ApiResponse.error(res, 'Token and deviceType are required', 400);
        const deviceId = req.deviceId;
        if (!deviceId)
            return response_1.ApiResponse.error(res, 'Device ID required', 401);
        yield notificationService.registerToken(deviceId, token, 'child', deviceType);
        return response_1.ApiResponse.success(res, null, 'Child token and device info registered');
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message);
    }
}));
// Fixed: Changed req type to any to avoid signature mismatch
router.get('/inbox', auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const parentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!parentId)
            return response_1.ApiResponse.error(res, 'Unauthorized', 401);
        const notifications = yield notificationService.getNotifications(parentId);
        return response_1.ApiResponse.success(res, notifications);
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message);
    }
}));
// Fixed: Changed req type to any to avoid signature mismatch and property access errors
router.patch('/:id/read', auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield notificationService.markAsRead(req.params.id);
        return response_1.ApiResponse.success(res, null, 'Marked as read');
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message);
    }
}));
exports.default = router;
//# sourceMappingURL=notification.routes.js.map