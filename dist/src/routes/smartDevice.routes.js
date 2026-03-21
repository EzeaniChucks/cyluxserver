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
const smartDevice_service_1 = require("../services/smartDevice.service");
const auth_1 = require("../middlewares/auth");
const response_1 = require("../utils/response");
const database_1 = require("../database");
const Child_1 = require("../entities/Child");
const router = (0, express_1.Router)();
const smartDeviceService = new smartDevice_service_1.SmartDeviceService();
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
router.get("/samsung/oauth-url", auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const url = smartDeviceService.getSmartThingsOAuthUrl(req.user.id);
        return response_1.ApiResponse.success(res, { url }, "OAuth URL generated");
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
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
router.get("/samsung/oauth-callback", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code, state } = req.query;
    const websiteUrl = process.env.WEBSITE_URL || "https://cylux.co";
    if (!code || !state) {
        return res.redirect(`${websiteUrl}/connect/samsung/error?msg=Missing+code+or+state`);
    }
    try {
        const devices = yield smartDeviceService.exchangeSmartThingsCode(code, state);
        return res.redirect(`${websiteUrl}/connect/samsung/success?count=${devices.length}`);
    }
    catch (e) {
        const msg = encodeURIComponent(e.message || "Connection failed");
        return res.redirect(`${websiteUrl}/connect/samsung/error?msg=${msg}`);
    }
}));
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
router.post("/samsung/callback", auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code, state } = req.body;
    if (!code || !state) {
        return response_1.ApiResponse.error(res, "code and state are required", 400);
    }
    try {
        const devices = yield smartDeviceService.exchangeSmartThingsCode(code, state);
        return response_1.ApiResponse.success(res, { devices }, `${devices.length} Samsung TV(s) connected`);
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
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
router.get("/home-assistant/discover", auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { baseUrl, haToken } = req.query;
    if (!baseUrl || !haToken) {
        return response_1.ApiResponse.error(res, "baseUrl and haToken are required", 400);
    }
    try {
        const devices = yield smartDeviceService.discoverHomeAssistantDevices(baseUrl, haToken);
        return response_1.ApiResponse.success(res, { devices });
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
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
router.post("/home-assistant", auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { baseUrl, entityId, deviceName, haToken } = req.body;
    if (!baseUrl || !entityId || !deviceName || !haToken) {
        return response_1.ApiResponse.error(res, "baseUrl, entityId, deviceName, and haToken are required", 400);
    }
    try {
        const device = yield smartDeviceService.addHomeAssistantDevice(req.user.id, baseUrl, entityId, deviceName, haToken);
        return response_1.ApiResponse.success(res, { device }, "Home Assistant TV connected");
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
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
router.get("/", auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [allCloud, appDevices] = yield Promise.all([
            smartDeviceService.getDevicesByParent(req.user.id),
            database_1.AppDataSource.getRepository(Child_1.ChildEntity).find({
                where: [
                    { parent: { id: req.user.id }, deviceType: "android_tv" },
                    { parent: { id: req.user.id }, deviceType: "tvos" },
                ],
                order: { lastSeen: "ASC" },
            }),
        ]);
        const cloudTvs = allCloud.filter((d) => d.deviceKind === "tv");
        const trackers = allCloud.filter((d) => d.deviceKind === "tracker");
        return response_1.ApiResponse.success(res, { cloudTvs, trackers, appDevices });
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 500);
    }
}));
// ── Tracker management ────────────────────────────────────────────────────────
/**
 * POST /api/smart-devices/trackers/discover
 *
 * Discovers Samsung SmartTag devices on the parent's SmartThings account.
 * Requires that the parent has already connected at least one Samsung TV
 * (shares the same OAuth tokens).
 */
router.post("/trackers/discover", auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const trackers = yield smartDeviceService.discoverSmartThingsTrackers(req.user.id);
        return response_1.ApiResponse.success(res, { trackers }, `${trackers.length} tracker(s) found`);
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
/**
 * POST /api/smart-devices/:id/tracker/refresh
 *
 * Polls SmartThings for the latest presence / location of a SmartTag.
 * Returns the updated device record with lastLocation.
 */
router.post("/:id/tracker/refresh", auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const device = yield smartDeviceService.refreshTrackerLocation(req.params.id, req.user.id);
        return response_1.ApiResponse.success(res, { device });
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
/**
 * PATCH /api/smart-devices/:id/link
 *
 * Links (or unlinks) a smart device to a child profile.
 * When the linked child is locked, this TV will be powered off.
 *
 * Body: { childId: string | null }
 */
router.patch("/:id/link", auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { childId } = req.body;
    try {
        const device = yield smartDeviceService.linkToChild(req.params.id, childId !== null && childId !== void 0 ? childId : null, req.user.id);
        const msg = childId
            ? `TV linked to child profile`
            : `TV unlinked from child profile`;
        return response_1.ApiResponse.success(res, { device }, msg);
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
/**
 * POST /api/smart-devices/:id/control
 *
 * Manually controls a smart TV (power on or off).
 *
 * Body: { action: "on" | "off" }
 */
router.post("/:id/control", auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { action } = req.body;
    if (action !== "on" && action !== "off") {
        return response_1.ApiResponse.error(res, 'action must be "on" or "off"', 400);
    }
    try {
        yield smartDeviceService.controlDevice(req.params.id, action, req.user.id);
        return response_1.ApiResponse.success(res, {}, `TV powered ${action}`);
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
/**
 * POST /api/smart-devices/tile
 *
 * Connects Tile trackers via the Tile Platform API.
 * Requires a Tile developer API key obtained from tile.com/developer.
 *
 * Body: { email: string, apiKey: string }
 * Response: { data: { trackers: SmartDevice[] } }
 */
router.post("/tile", auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, apiKey } = req.body;
    if (!email || !apiKey) {
        return response_1.ApiResponse.error(res, "email and apiKey are required", 400);
    }
    try {
        const trackers = yield smartDeviceService.connectTileTrackers(req.user.id, email, apiKey);
        return response_1.ApiResponse.success(res, { trackers }, `${trackers.length} Tile tracker(s) connected`);
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
/**
 * DELETE /api/smart-devices/:id
 *
 * Disconnects a smart TV from the parent's account.
 */
router.delete("/:id", auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield smartDeviceService.removeDevice(req.params.id, req.user.id);
        return response_1.ApiResponse.success(res, {}, "Smart device removed");
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
exports.default = router;
//# sourceMappingURL=smartDevice.routes.js.map