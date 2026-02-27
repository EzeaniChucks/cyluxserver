import { Router } from "express";
import { ApiResponse } from "../utils/response";
import { protectParent, protectChild } from "../middlewares/auth";
import { AppDataSource } from "../database";
import { ChildEntity } from "../entities/Child";
import { AuditLogEntity } from "../entities/AuditLog";
import { ChildService } from "../services/child.service";
import { subscriptionService } from "../services/subscription.service";

const router = Router();
const childRepo = AppDataSource.getRepository(ChildEntity);
const auditLogRepo = AppDataSource.getRepository(AuditLogEntity);
const childService = new ChildService();

// Child reports VPN status (persists to audit log)
router.post("/status", protectChild, async (req: any, res: any) => {
  try {
    const childId = req.deviceId;
    const { status, blockedDomains, blockedIPs, errorMessage } = req.body;

    const child = await childRepo.findOne({ where: { id: childId } });
    if (!child) return ApiResponse.error(res, "Child not found", 404);

    // Persist VPN status to audit log
    await auditLogRepo.save(
      auditLogRepo.create({
        childId,
        actionType: "VPN_STATUS" as any,
        details: `VPN status: ${status}`,
        metadata: {
          vpnStatus: status,
          blockedDomains: Array.isArray(blockedDomains) ? blockedDomains.slice(0, 100) : [],
          blockedIPs: Array.isArray(blockedIPs) ? blockedIPs.slice(0, 100) : [],
          errorMessage: errorMessage || null,
        } as any,
      })
    );

    return ApiResponse.success(res, null, "VPN status recorded");
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Parent gets real VPN statistics from audit logs
router.get("/stats/:childId", protectParent, async (req: any, res: any) => {
  try {
    const { childId } = req.params;

    // VPN stats require Premium or higher
    const { allowed } = await subscriptionService.checkLimit(req.user.id, 'vpnFiltering');
    if (!allowed) {
      return ApiResponse.error(res, 'VPN filtering requires Premium or higher. Upgrade your plan to access this feature.', 403);
    }

    const child = await childRepo.findOne({
      where: { id: childId, parent: { id: req.user.id } },
    });
    if (!child) return ApiResponse.error(res, "Child not found", 404);

    const stats = await childService.getVpnStats(childId);
    return ApiResponse.success(res, stats, "VPN statistics");
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

export default router;
