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
        const url = smartDeviceService.getSmartThingsOAuthUrl(req.parent.id);
        return response_1.ApiResponse.success(res, { url }, "OAuth URL generated");
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
/**
 * POST /api/smart-devices/samsung/callback
 *
 * Exchanges the SmartThings authorization code for tokens and discovers
 * TV devices on the account.
 *
 * Body: { code: string, state: string }
 *
 * The SmartThings redirect page (cyluxwebsite /connect/samsung/callback)
 * POSTs the code + state from the URL to this endpoint with the parent's JWT.
 *
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
        const device = yield smartDeviceService.addHomeAssistantDevice(req.parent.id, baseUrl, entityId, deviceName, haToken);
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
 * Lists all smart TV devices connected to the authenticated parent's account.
 */
router.get("/", auth_1.protectParent, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const devices = yield smartDeviceService.getDevicesByParent(req.parent.id);
        return response_1.ApiResponse.success(res, { devices });
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 500);
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
        const device = yield smartDeviceService.linkToChild(req.params.id, childId !== null && childId !== void 0 ? childId : null, req.parent.id);
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
        yield smartDeviceService.controlDevice(req.params.id, action, req.parent.id);
        return response_1.ApiResponse.success(res, {}, `TV powered ${action}`);
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
        yield smartDeviceService.removeDevice(req.params.id, req.parent.id);
        return response_1.ApiResponse.success(res, {}, "Smart device removed");
    }
    catch (e) {
        return response_1.ApiResponse.error(res, e.message, 400);
    }
}));
exports.default = router;
//# sourceMappingURL=smartDevice.routes.js.map