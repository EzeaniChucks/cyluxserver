import { Request, Response } from "express";
import { networkService } from "../services/network.service";
import { ApiResponse } from "../utils/response";

export const networkController = {
  /**
   * GET /api/network/profile
   * Return the authenticated parent's network profile (API key masked).
   */
  async getProfile(req: Request, res: Response) {
    try {
      const parentId = (req as any).parentId as string;
      const profile = await networkService.getOrCreate(parentId);
      return ApiResponse.success(res, networkService.toPublic(profile));
    } catch (e: any) {
      return ApiResponse.error(res, e.message, 500);
    }
  },

  /**
   * PUT /api/network/profile
   * Update settings: apiKey, profileId, autoSync, enabled, extraBlockedDomains.
   */
  async updateProfile(req: Request, res: Response) {
    try {
      const parentId = (req as any).parentId as string;
      const {
        nextdnsApiKey,
        nextdnsProfileId,
        nextdnsProfileName,
        autoSync,
        enabled,
        extraBlockedDomains,
      } = req.body;

      const profile = await networkService.update(parentId, {
        ...(nextdnsApiKey !== undefined ? { nextdnsApiKey } : {}),
        ...(nextdnsProfileId !== undefined ? { nextdnsProfileId } : {}),
        ...(nextdnsProfileName !== undefined ? { nextdnsProfileName } : {}),
        ...(autoSync !== undefined ? { autoSync } : {}),
        ...(enabled !== undefined ? { enabled } : {}),
        ...(extraBlockedDomains !== undefined ? { extraBlockedDomains } : {}),
      });

      return ApiResponse.success(res, networkService.toPublic(profile));
    } catch (e: any) {
      return ApiResponse.error(res, e.message, 500);
    }
  },

  /**
   * POST /api/network/profile/test
   * Body: { apiKey }
   * Verifies the NextDNS API key without saving it.
   */
  async testConnection(req: Request, res: Response) {
    try {
      const { apiKey } = req.body;
      if (!apiKey) return ApiResponse.error(res, "apiKey required", 400);
      const result = await networkService.testConnection(apiKey);
      if (!result.ok) {
        return ApiResponse.error(res, "Invalid NextDNS API key", 401);
      }
      return ApiResponse.success(res, result);
    } catch (e: any) {
      return ApiResponse.error(res, e.message, 500);
    }
  },

  /**
   * POST /api/network/profile/create-nextdns
   * Create a new NextDNS profile using the stored API key.
   * Returns the new profile ID.
   */
  async createNextDnsProfile(req: Request, res: Response) {
    try {
      const parentId = (req as any).parentId as string;
      const parentRepo = (await import("../database")).AppDataSource.getRepository(
        (await import("../entities/Parent")).ParentEntity
      );
      const parent = await parentRepo.findOneBy({ id: parentId });
      if (!parent) return ApiResponse.error(res, "Parent not found", 404);

      const profile = await networkService.getOrCreate(parentId);
      if (!profile.nextdnsApiKey) {
        return ApiResponse.error(res, "Save your NextDNS API key first", 400);
      }

      const newProfileId = await networkService.createNextDnsProfile(
        profile.nextdnsApiKey,
        parent.email
      );

      const updated = await networkService.update(parentId, {
        nextdnsProfileId: newProfileId,
        nextdnsProfileName: `Cylux – ${parent.email}`,
        enabled: true,
      });

      // Kick off initial sync
      networkService.syncDomains(parentId).catch(() => null);

      return ApiResponse.success(
        res,
        { profileId: newProfileId, ...networkService.toPublic(updated) },
        "NextDNS profile created"
      );
    } catch (e: any) {
      return ApiResponse.error(res, e.message, 500);
    }
  },

  /**
   * POST /api/network/profile/sync
   * Manually trigger a domain sync to NextDNS.
   */
  async syncDomains(req: Request, res: Response) {
    try {
      const parentId = (req as any).parentId as string;
      const count = await networkService.syncDomains(parentId);
      return ApiResponse.success(res, { domainsSynced: count });
    } catch (e: any) {
      return ApiResponse.error(res, e.message, 500);
    }
  },

  /**
   * GET /api/network/profile/setup-instructions
   * Returns DNS IPs + DOH/DOT hostnames for router configuration.
   */
  async getSetupInstructions(req: Request, res: Response) {
    try {
      const parentId = (req as any).parentId as string;
      const profile = await networkService.getOrCreate(parentId);

      if (!profile.nextdnsApiKey || !profile.nextdnsProfileId) {
        return ApiResponse.success(res, {
          configured: false,
          instructions: null,
        });
      }

      const ips = await networkService.getLinkedIps(
        profile.nextdnsApiKey,
        profile.nextdnsProfileId
      );

      return ApiResponse.success(res, {
        configured: true,
        profileId: profile.nextdnsProfileId,
        dns: {
          ipv4Primary: ips.ipv4[0] ?? "45.90.28.0",
          ipv4Secondary: ips.ipv4[1] ?? "45.90.30.0",
          ipv6Primary: ips.ipv6[0] ?? null,
          doh: `https://dns.nextdns.io/${profile.nextdnsProfileId}`,
          dot: `${profile.nextdnsProfileId}.dns.nextdns.io`,
        },
        steps: {
          general: [
            "Log in to your home router's admin panel (usually at 192.168.1.1 or 192.168.0.1)",
            "Find the DNS settings (often under WAN, Internet, or DHCP settings)",
            `Set Primary DNS to: ${ips.ipv4[0] ?? "45.90.28.0"}`,
            `Set Secondary DNS to: ${ips.ipv4[1] ?? "45.90.30.0"}`,
            "Save and restart the router",
            "All devices on your network — including Roku, smart TVs, and gaming consoles — will now be filtered",
          ],
          doH: `For devices that support DNS-over-HTTPS, use: https://dns.nextdns.io/${profile.nextdnsProfileId}`,
          note:
            "Devices that manually override their own DNS settings will bypass router-level filtering. For those, install the Cylux app directly on the device.",
        },
      });
    } catch (e: any) {
      return ApiResponse.error(res, e.message, 500);
    }
  },
};
