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
const response_1 = require("../utils/response");
const auth_1 = require("../middlewares/auth");
const database_1 = require("../database");
const Child_1 = require("../entities/Child");
const AuditLog_1 = require("../entities/AuditLog");
const child_service_1 = require("../services/child.service");
const subscription_service_1 = require("../services/subscription.service");
const router = (0, express_1.Router)();
const childRepo = database_1.AppDataSource.getRepository(Child_1.ChildEntity);
const auditLogRepo = database_1.AppDataSource.getRepository(AuditLog_1.AuditLogEntity);
const childService = new child_service_1.ChildService();
// Child reports VPN status (persists to audit log)
router.post("/status", auth_1.protectChild, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const childId = req.deviceId;
        const { status, blockedDomains, blockedIPs, errorMessage } = req.body;
        const child = yield childRepo.findOne({ where: { id: childId } });
        if (!child)
            return response_1.ApiResponse.error(res, "Child not found", 404);
        // Persist VPN status to audit log
        yield auditLogRepo.save(auditLogRepo.create({
            childId,
            actionType: "VPN_STATUS",
            details: `VPN status: ${status}`,
            metadata: {
                vpnStatus: status,
                blockedDomains: Array.isArray(blockedDomains) ? blockedDomains.slice(0, 100) : [],
                blockedIPs: Array.isArray(blockedIPs) ? blockedIPs.slice(0, 100) : [],
                errorMessage: errorMessage || null,
            },
        }));
        return response_1.ApiResponse.success(res, null, "VPN status recorded");
    }
    catch (error) {
        return response_1.ApiResponse.error(res, error.message);
    }
}));
// Parent gets real VPN statistics from audit logs
router.get("/stats/:childId", auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { childId } = req.params;
        // VPN stats require Premium or higher
        const { allowed } = yield subscription_service_1.subscriptionService.checkLimit(req.user.id, 'vpnFiltering');
        if (!allowed) {
            return response_1.ApiResponse.error(res, 'VPN filtering requires Premium or higher. Upgrade your plan to access this feature.', 403);
        }
        const child = yield childRepo.findOne({
            where: { id: childId, parent: { id: req.user.id } },
        });
        if (!child)
            return response_1.ApiResponse.error(res, "Child not found", 404);
        const stats = yield childService.getVpnStats(childId);
        return response_1.ApiResponse.success(res, stats, "VPN statistics");
    }
    catch (error) {
        return response_1.ApiResponse.error(res, error.message);
    }
}));
exports.default = router;
//# sourceMappingURL=vpn.routes.js.map