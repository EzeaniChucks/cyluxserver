import { Router } from "express";
import { SmartDeviceService } from "../services/smartDevice.service";
import { protectParent } from "../middlewares/auth";
import { ApiResponse } from "../utils/response";
import { AppDataSource } from "../database";
import { ChildEntity } from "../entities/Child";

const router = Router();
const smartDeviceService = new SmartDeviceService();

// ── Samsung SmartThings ───────────────────────────────────────────────────────

/**
 * GET /api/smart-devices/samsung/oauth-url
 *
 * Returns the SmartThings authorization URL for the authenticated parent.
 * The parent app opens this URL in a browser or webview.
 * After the user approves, SmartThings redirects to SMARTTHINGS_REDIRECT_URI.
 *
 * Response: { data: { url: "https://api.smartthings.com/oauth/authorize?..." } }
 */
router.get(
  "/samsung/oauth-url",
  protectParent,
  async (req: any, res: any) => {
    try {
      const url = smartDeviceService.getSmartThingsOAuthUrl(req.user.id);
      return ApiResponse.success(res, { url }, "OAuth URL generated");
    } catch (e: any) {
      return ApiResponse.error(res, e.message, 400);
    }
  }
);

/**
 * GET /api/smart-devices/samsung/oauth-callback
 *
 * SmartThings redirects here after the parent approves OAuth.
 * No JWT required — the `state` param is a short-lived signed JWT that
 * identifies the parent (set in SMARTTHINGS_REDIRECT_URI).
 *
 * On success: redirects to {WEBSITE_URL}/connect/samsung/success?count=N
 * On error:   redirects to {WEBSITE_URL}/connect/samsung/error?msg=...
 */
router.get("/samsung/oauth-callback", async (req: any, res: any) => {
  const { code, state } = req.query as { code?: string; state?: string };
  const websiteUrl =
    process.env.WEBSITE_URL || "https://cylux.co";

  if (!code || !state) {
    return res.redirect(
      `${websiteUrl}/connect/samsung/error?msg=Missing+code+or+state`
    );
  }

  try {
    const devices = await smartDeviceService.exchangeSmartThingsCode(
      code,
      state
    );
    return res.redirect(
      `${websiteUrl}/connect/samsung/success?count=${devices.length}`
    );
  } catch (e: any) {
    const msg = encodeURIComponent(e.message || "Connection failed");
    return res.redirect(`${websiteUrl}/connect/samsung/error?msg=${msg}`);
  }
});

/**
 * POST /api/smart-devices/samsung/callback
 *
 * Alternative callback for web clients that are already authenticated.
 * The cyluxwebsite /connect/samsung page can POST code+state with the
 * parent's JWT if the parent is logged in on the website.
 *
 * Body: { code: string, state: string }
 * Response: { data: { devices: SmartDevice[] } }
 */
router.post(
  "/samsung/callback",
  protectParent,
  async (req: any, res: any) => {
    const { code, state } = req.body;
    if (!code || !state) {
      return ApiResponse.error(res, "code and state are required", 400);
    }
    try {
      const devices = await smartDeviceService.exchangeSmartThingsCode(code, state);
      return ApiResponse.success(
        res,
        { devices },
        `${devices.length} Samsung TV(s) connected`
      );
    } catch (e: any) {
      return ApiResponse.error(res, e.message, 400);
    }
  }
);

// ── Home Assistant ────────────────────────────────────────────────────────────

/**
 * GET /api/smart-devices/home-assistant/discover
 *
 * Queries the parent's Home Assistant instance for all media_player entities.
 * Returns a picker list so the parent doesn't have to type the entity_id.
 *
 * Query params: baseUrl, haToken
 * Response: { data: { devices: [{ entityId, friendlyName, state }] } }
 */
router.get(
  "/home-assistant/discover",
  protectParent,
  async (req: any, res: any) => {
    const { baseUrl, haToken } = req.query;
    if (!baseUrl || !haToken) {
      return ApiResponse.error(res, "baseUrl and haToken are required", 400);
    }
    try {
      const devices = await smartDeviceService.discoverHomeAssistantDevices(
        baseUrl as string,
        haToken as string
      );
      return ApiResponse.success(res, { devices });
    } catch (e: any) {
      return ApiResponse.error(res, e.message, 400);
    }
  }
);

/**
 * POST /api/smart-devices/home-assistant
 *
 * Adds a Home Assistant-managed TV.  Parent provides their HA URL,
 * a long-lived access token, and the entity_id of the media_player.
 *
 * Covers: LG webOS, Philips, Vizio, Sony, and any TV with an HA integration.
 *
 * Body: { baseUrl, entityId, deviceName, haToken }
 * Response: { data: { device: SmartDevice } }
 */
router.post(
  "/home-assistant",
  protectParent,
  async (req: any, res: any) => {
    const { baseUrl, entityId, deviceName, haToken } = req.body;
    if (!baseUrl || !entityId || !deviceName || !haToken) {
      return ApiResponse.error(
        res,
        "baseUrl, entityId, deviceName, and haToken are required",
        400
      );
    }
    try {
      const device = await smartDeviceService.addHomeAssistantDevice(
        req.user.id,
        baseUrl,
        entityId,
        deviceName,
        haToken
      );
      return ApiResponse.success(res, { device }, "Home Assistant TV connected");
    } catch (e: any) {
      return ApiResponse.error(res, e.message, 400);
    }
  }
);

// ── Shared device management ──────────────────────────────────────────────────

/**
 * GET /api/smart-devices
 *
 * Returns all smart devices for the authenticated parent, split by type:
 *   cloudTvs:    Samsung/HA power-controllable TVs (deviceKind="tv")
 *   trackers:    Samsung SmartTag trackers (deviceKind="tracker")
 *   appDevices:  Child profiles with deviceType 'android_tv' | 'tvos'
 *                (cyluxchildtv app paired to a child profile)
 */
router.get("/", protectParent, async (req: any, res: any) => {
  try {
    const [allCloud, appDevices] = await Promise.all([
      smartDeviceService.getDevicesByParent(req.user.id),
      AppDataSource.getRepository(ChildEntity).find({
        where: [
          { parent: { id: req.user.id }, deviceType: "android_tv" as any },
          { parent: { id: req.user.id }, deviceType: "tvos" as any },
        ],
        order: { lastSeen: "ASC" },
      }),
    ]);
    const cloudTvs = allCloud.filter((d) => d.deviceKind === "tv");
    const trackers = allCloud.filter((d) => d.deviceKind === "tracker");
    return ApiResponse.success(res, { cloudTvs, trackers, appDevices });
  } catch (e: any) {
    return ApiResponse.error(res, e.message, 500);
  }
});

// ── Tracker management ────────────────────────────────────────────────────────

/**
 * POST /api/smart-devices/trackers/discover
 *
 * Discovers Samsung SmartTag devices on the parent's SmartThings account.
 * Requires that the parent has already connected at least one Samsung TV
 * (shares the same OAuth tokens).
 */
router.post(
  "/trackers/discover",
  protectParent,
  async (req: any, res: any) => {
    try {
      const trackers = await smartDeviceService.discoverSmartThingsTrackers(
        req.user.id
      );
      return ApiResponse.success(
        res,
        { trackers },
        `${trackers.length} tracker(s) found`
      );
    } catch (e: any) {
      return ApiResponse.error(res, e.message, 400);
    }
  }
);

/**
 * POST /api/smart-devices/:id/tracker/refresh
 *
 * Polls SmartThings for the latest presence / location of a SmartTag.
 * Returns the updated device record with lastLocation.
 */
router.post(
  "/:id/tracker/refresh",
  protectParent,
  async (req: any, res: any) => {
    try {
      const device = await smartDeviceService.refreshTrackerLocation(
        req.params.id,
        req.user.id
      );
      return ApiResponse.success(res, { device });
    } catch (e: any) {
      return ApiResponse.error(res, e.message, 400);
    }
  }
);

/**
 * PATCH /api/smart-devices/:id/link
 *
 * Links (or unlinks) a smart device to a child profile.
 * When the linked child is locked, this TV will be powered off.
 *
 * Body: { childId: string | null }
 */
router.patch("/:id/link", protectParent, async (req: any, res: any) => {
  const { childId } = req.body;
  try {
    const device = await smartDeviceService.linkToChild(
      req.params.id,
      childId ?? null,
      req.user.id
    );
    const msg = childId
      ? `TV linked to child profile`
      : `TV unlinked from child profile`;
    return ApiResponse.success(res, { device }, msg);
  } catch (e: any) {
    return ApiResponse.error(res, e.message, 400);
  }
});

/**
 * POST /api/smart-devices/:id/control
 *
 * Manually controls a smart TV (power on or off).
 *
 * Body: { action: "on" | "off" }
 */
router.post("/:id/control", protectParent, async (req: any, res: any) => {
  const { action } = req.body;
  if (action !== "on" && action !== "off") {
    return ApiResponse.error(res, 'action must be "on" or "off"', 400);
  }
  try {
    await smartDeviceService.controlDevice(req.params.id, action, req.user.id);
    return ApiResponse.success(res, {}, `TV powered ${action}`);
  } catch (e: any) {
    return ApiResponse.error(res, e.message, 400);
  }
});

/**
 * POST /api/smart-devices/tile
 *
 * Connects Tile trackers via the Tile Platform API.
 * Requires a Tile developer API key obtained from tile.com/developer.
 *
 * Body: { email: string, apiKey: string }
 * Response: { data: { trackers: SmartDevice[] } }
 */
router.post("/tile", protectParent, async (req: any, res: any) => {
  const { email, apiKey } = req.body;
  if (!email || !apiKey) {
    return ApiResponse.error(res, "email and apiKey are required", 400);
  }
  try {
    const trackers = await smartDeviceService.connectTileTrackers(
      req.user.id,
      email,
      apiKey
    );
    return ApiResponse.success(
      res,
      { trackers },
      `${trackers.length} Tile tracker(s) connected`
    );
  } catch (e: any) {
    return ApiResponse.error(res, e.message, 400);
  }
});

/**
 * DELETE /api/smart-devices/:id
 *
 * Disconnects a smart TV from the parent's account.
 */
router.delete("/:id", protectParent, async (req: any, res: any) => {
  try {
    await smartDeviceService.removeDevice(req.params.id, req.user.id);
    return ApiResponse.success(res, {}, "Smart device removed");
  } catch (e: any) {
    return ApiResponse.error(res, e.message, 400);
  }
});

export default router;
