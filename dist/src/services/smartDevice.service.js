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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartDeviceService = void 0;
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../database");
const SmartDevice_1 = require("../entities/SmartDevice");
// ── SmartThings API constants ────────────────────────────────────────────────
const ST_AUTHORIZE_URL = "https://api.smartthings.com/oauth/authorize";
const ST_TOKEN_URL = "https://api.smartthings.com/oauth/token";
const ST_DEVICES_URL = "https://api.smartthings.com/v1/devices";
const ST_COMMAND_URL = (deviceId) => `https://api.smartthings.com/v1/devices/${deviceId}/commands`;
// SmartThings device categories that represent televisions
const TV_CATEGORIES = new Set(["Television", "SmartTV", "OTT_PLAY_DEVICE"]);
// SmartThings device categories / capabilities that represent trackers (SmartTag)
const TRACKER_CATEGORIES = new Set(["Tracking", "Presense Sensor", "Mobile"]);
const ST_DEVICE_STATUS_URL = (deviceId) => `https://api.smartthings.com/v1/devices/${deviceId}/status`;
// ── OAuth state helpers ──────────────────────────────────────────────────────
// The OAuth `state` param is a short-lived JWT so the callback can identify
// which parent initiated the flow without storing server-side session state.
const STATE_SECRET = () => process.env.JWT_SECRET || "cylux-smartthings-state-fallback";
const STATE_TTL_SECONDS = 600; // 10 minutes
function createOAuthState(parentId) {
    const payload = {
        parentId,
        nonce: Math.random().toString(36).slice(2),
    };
    return jsonwebtoken_1.default.sign(payload, STATE_SECRET(), { expiresIn: STATE_TTL_SECONDS });
}
function verifyOAuthState(state) {
    try {
        return jsonwebtoken_1.default.verify(state, STATE_SECRET());
    }
    catch (_a) {
        throw new Error("Invalid or expired OAuth state");
    }
}
// ── Service ──────────────────────────────────────────────────────────────────
class SmartDeviceService {
    constructor() {
        this.repo = database_1.AppDataSource.getRepository(SmartDevice_1.SmartDeviceEntity);
    }
    // ── SmartThings OAuth ──────────────────────────────────────────────────────
    /**
     * Returns the SmartThings OAuth authorization URL for the given parent.
     * The parent app opens this URL in a browser / webview.
     * After the user approves, SmartThings redirects to SMARTTHINGS_REDIRECT_URI
     * with `?code=...&state=...`.
     */
    getSmartThingsOAuthUrl(parentId) {
        const clientId = process.env.SMARTTHINGS_CLIENT_ID;
        const redirectUri = process.env.SMARTTHINGS_REDIRECT_URI;
        if (!clientId || !redirectUri) {
            throw new Error("SmartThings integration not configured. Set SMARTTHINGS_CLIENT_ID and SMARTTHINGS_REDIRECT_URI.");
        }
        const state = createOAuthState(parentId);
        const params = new URLSearchParams({
            client_id: clientId,
            scope: "r:devices:* x:devices:*",
            response_type: "code",
            redirect_uri: redirectUri,
            state,
        });
        return `${ST_AUTHORIZE_URL}?${params.toString()}`;
    }
    /**
     * Exchanges the SmartThings authorization code for OAuth tokens.
     * Calls the SmartThings token endpoint, then discovers TV devices on the
     * account and saves the first one (or all of them — parent can later choose
     * which to link to a child).
     *
     * Returns the list of saved SmartDevice records.
     */
    exchangeSmartThingsCode(code, state) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify state to prevent CSRF
            const { parentId } = verifyOAuthState(state);
            const clientId = process.env.SMARTTHINGS_CLIENT_ID;
            const clientSecret = process.env.SMARTTHINGS_CLIENT_SECRET;
            const redirectUri = process.env.SMARTTHINGS_REDIRECT_URI;
            if (!clientId || !clientSecret || !redirectUri) {
                throw new Error("SmartThings integration not fully configured.");
            }
            // Exchange code for tokens
            const tokenRes = yield axios_1.default.post(ST_TOKEN_URL, new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
            }).toString(), {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: "Basic " +
                        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
                },
            });
            const { access_token, refresh_token, expires_in } = tokenRes.data;
            const tokenExpiry = new Date(Date.now() + expires_in * 1000);
            // Discover and save TV devices
            return this.discoverAndSaveSmartThingsDevices(parentId, access_token, refresh_token, tokenExpiry);
        });
    }
    /**
     * Discovers TV-capable devices on the SmartThings account and upserts them
     * in the database.  Returns the saved records.
     */
    discoverAndSaveSmartThingsDevices(parentId, accessToken, refreshToken, tokenExpiry) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const devicesRes = yield axios_1.default.get(ST_DEVICES_URL, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const allDevices = (_a = devicesRes.data.items) !== null && _a !== void 0 ? _a : [];
            // Filter for TV-like devices by category or by having a "switch" capability
            const tvDevices = allDevices.filter((d) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                const category = (_e = (_d = (_c = (_b = (_a = d.components) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.categories) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : "";
                const caps = (_j = (_h = (_g = (_f = d.components) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.capabilities) === null || _h === void 0 ? void 0 : _h.map((c) => c.id)) !== null && _j !== void 0 ? _j : [];
                return TV_CATEGORIES.has(category) || caps.includes("tvChannel");
            });
            const saved = [];
            for (const device of tvDevices) {
                // Upsert: if a device with this externalDeviceId already exists for
                // this parent, refresh its tokens instead of creating a duplicate.
                let existing = yield this.repo.findOne({
                    where: { parentId, externalDeviceId: device.deviceId },
                });
                if (existing) {
                    existing.accessToken = accessToken;
                    existing.refreshToken = refreshToken;
                    existing.tokenExpiry = tokenExpiry;
                    existing.deviceName = (_c = (_b = device.label) !== null && _b !== void 0 ? _b : device.name) !== null && _c !== void 0 ? _c : "Samsung TV";
                    existing.isActive = true;
                    saved.push(yield this.repo.save(existing));
                }
                else {
                    const entity = this.repo.create({
                        parentId,
                        platform: "smartthings",
                        externalDeviceId: device.deviceId,
                        deviceName: (_e = (_d = device.label) !== null && _d !== void 0 ? _d : device.name) !== null && _e !== void 0 ? _e : "Samsung TV",
                        accessToken,
                        refreshToken,
                        tokenExpiry,
                        baseUrl: null,
                        isActive: true,
                    });
                    saved.push(yield this.repo.save(entity));
                }
            }
            return saved;
        });
    }
    // ── Home Assistant ─────────────────────────────────────────────────────────
    /**
     * Queries a Home Assistant instance for all media_player entities.
     * Called before adding a device so the parent can pick from a list
     * instead of typing the entity_id manually.
     */
    discoverHomeAssistantDevices(baseUrl, haToken) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const base = baseUrl.replace(/\/$/, "");
            try {
                const res = yield axios_1.default.get(`${base}/api/states`, {
                    headers: { Authorization: `Bearer ${haToken}` },
                    timeout: 8000,
                });
                const states = (_a = res.data) !== null && _a !== void 0 ? _a : [];
                return states
                    .filter((s) => { var _a; return (_a = s.entity_id) === null || _a === void 0 ? void 0 : _a.startsWith("media_player."); })
                    .map((s) => {
                    var _a, _b, _c;
                    return ({
                        entityId: s.entity_id,
                        friendlyName: (_b = (_a = s.attributes) === null || _a === void 0 ? void 0 : _a.friendly_name) !== null && _b !== void 0 ? _b : s.entity_id,
                        state: (_c = s.state) !== null && _c !== void 0 ? _c : "unknown",
                    });
                });
            }
            catch (e) {
                throw new Error(`Could not reach Home Assistant at ${base}: ${(_c = (_b = e.response) === null || _b === void 0 ? void 0 : _b.status) !== null && _c !== void 0 ? _c : e.message}`);
            }
        });
    }
    /**
     * Adds a Home Assistant-managed TV to a parent account.
     *
     * The parent provides:
     *   baseUrl    — HA instance URL, e.g. "http://192.168.1.50:8123"
     *   entityId   — HA media_player entity_id, e.g. "media_player.living_room_tv"
     *   deviceName — Human-readable label
     *   haToken    — Long-lived access token from HA → Profile → Long-lived access tokens
     *
     * Validates the token by calling GET /api/ on the HA instance before saving.
     */
    addHomeAssistantDevice(parentId, baseUrl, entityId, deviceName, haToken) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // Strip trailing slash
            const base = baseUrl.replace(/\/$/, "");
            // Validate HA credentials — GET /api/ returns { "message": "API running." }
            try {
                yield axios_1.default.get(`${base}/api/`, {
                    headers: { Authorization: `Bearer ${haToken}` },
                    timeout: 8000,
                });
            }
            catch (e) {
                throw new Error(`Could not reach Home Assistant at ${base}: ${(_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.status) !== null && _b !== void 0 ? _b : e.message}`);
            }
            // Upsert by entity_id within this parent account
            let existing = yield this.repo.findOne({
                where: { parentId, externalDeviceId: entityId, platform: "home_assistant" },
            });
            if (existing) {
                existing.deviceName = deviceName;
                existing.accessToken = haToken;
                existing.baseUrl = base;
                existing.isActive = true;
                return this.repo.save(existing);
            }
            const entity = this.repo.create({
                parentId,
                platform: "home_assistant",
                externalDeviceId: entityId,
                deviceName,
                accessToken: haToken,
                refreshToken: null,
                tokenExpiry: null,
                baseUrl: base,
                isActive: true,
            });
            return this.repo.save(entity);
        });
    }
    // ── SmartThings tracker (SmartTag) ─────────────────────────────────────────
    /**
     * Discovers SmartTag / tracker devices on the parent's SmartThings account.
     * Identifies them by the `presenceSensor` capability or `Tracking` category.
     * Shares the same OAuth tokens as the TV connection — no new auth needed.
     *
     * Returns the saved tracker records.
     */
    discoverSmartThingsTrackers(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            // Find any existing SmartThings TV device to borrow a valid token
            const existing = yield this.repo.findOne({
                where: { parentId, platform: "smartthings", deviceKind: "tv" },
                order: { updatedAt: "DESC" },
            });
            if (!existing) {
                throw new Error("Connect a Samsung TV first — SmartTag uses the same SmartThings account.");
            }
            const token = yield this.getValidSmartThingsToken(existing);
            const devicesRes = yield axios_1.default.get(ST_DEVICES_URL, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const allDevices = (_a = devicesRes.data.items) !== null && _a !== void 0 ? _a : [];
            // Filter for tracker-like devices: presenceSensor capability or Tracking category
            const trackerDevices = allDevices.filter((d) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                const category = (_e = (_d = (_c = (_b = (_a = d.components) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.categories) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : "";
                const caps = (_j = (_h = (_g = (_f = d.components) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.capabilities) === null || _h === void 0 ? void 0 : _h.map((c) => c.id)) !== null && _j !== void 0 ? _j : [];
                return (TRACKER_CATEGORIES.has(category) ||
                    caps.includes("presenceSensor") ||
                    caps.includes("samsungvd.relayLocation"));
            });
            const saved = [];
            for (const device of trackerDevices) {
                let rec = yield this.repo.findOne({
                    where: { parentId, externalDeviceId: device.deviceId, deviceKind: "tracker" },
                });
                if (rec) {
                    rec.deviceName = (_c = (_b = device.label) !== null && _b !== void 0 ? _b : device.name) !== null && _c !== void 0 ? _c : "SmartTag";
                    rec.isActive = true;
                    saved.push(yield this.repo.save(rec));
                }
                else {
                    const newRec = this.repo.create({
                        parentId,
                        platform: "smartthings",
                        deviceKind: "tracker",
                        externalDeviceId: device.deviceId,
                        deviceName: (_e = (_d = device.label) !== null && _d !== void 0 ? _d : device.name) !== null && _e !== void 0 ? _e : "SmartTag",
                        accessToken: existing.accessToken,
                        refreshToken: existing.refreshToken,
                        tokenExpiry: existing.tokenExpiry,
                        baseUrl: null,
                        lastLocation: null,
                        isActive: true,
                    });
                    saved.push(yield this.repo.save(newRec));
                }
            }
            return saved;
        });
    }
    /**
     * Polls SmartThings for the current presence / location of a tracker device.
     * Updates lastLocation in the database and returns it.
     */
    refreshTrackerLocation(trackerId, parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            const device = yield this.repo.findOne({
                where: { id: trackerId, parentId, deviceKind: "tracker" },
            });
            if (!device)
                throw new Error("Tracker not found");
            const token = yield this.getValidSmartThingsToken(device);
            const statusRes = yield axios_1.default.get(ST_DEVICE_STATUS_URL(device.externalDeviceId), {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000,
            });
            const components = (_c = (_b = (_a = statusRes.data) === null || _a === void 0 ? void 0 : _a.components) === null || _b === void 0 ? void 0 : _b.main) !== null && _c !== void 0 ? _c : {};
            const presence = (_f = (_e = (_d = components.presenceSensor) === null || _d === void 0 ? void 0 : _d.presence) === null || _e === void 0 ? void 0 : _e.value) !== null && _f !== void 0 ? _f : "unknown";
            // SmartTag+ / newer models may expose coordinates via threeAxis or location
            const lat = (_j = (_h = (_g = components["samsungvd.relayLocation"]) === null || _g === void 0 ? void 0 : _g.locationLatitude) === null || _h === void 0 ? void 0 : _h.value) !== null && _j !== void 0 ? _j : null;
            const lng = (_m = (_l = (_k = components["samsungvd.relayLocation"]) === null || _k === void 0 ? void 0 : _k.locationLongitude) === null || _l === void 0 ? void 0 : _l.value) !== null && _m !== void 0 ? _m : null;
            const location = {
                lat: lat !== null && lat !== void 0 ? lat : 0,
                lng: lng !== null && lng !== void 0 ? lng : 0,
                presence: presence,
                updatedAt: new Date().toISOString(),
            };
            yield this.repo.update(device.id, { lastLocation: location });
            device.lastLocation = location;
            console.log(`[SmartDevice] Tracker "${device.deviceName}" presence=${presence}, ` +
                (lat !== null ? `coords=${lat},${lng}` : "no GPS"));
            return device;
        });
    }
    // ── Tile tracker ──────────────────────────────────────────────────────────
    /**
     * Connects Tile trackers using the Tile Platform API.
     * Requires API credentials from tile.com/developer (Life360 approval needed).
     *
     * Tile API endpoint: https://platform.tile.com/api/v1/
     * Auth: Basic auth with email:apiKey encoded as base64.
     */
    connectTileTrackers(parentId, email, apiKey) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            const TILE_API = "https://platform.tile.com/api/v1";
            const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");
            // Fetch tile list
            const res = yield axios_1.default.get(`${TILE_API}/tiles`, {
                headers: { Authorization: `Basic ${auth}` },
                timeout: 10000,
            });
            const tiles = (_d = (_b = (_a = res.data) === null || _a === void 0 ? void 0 : _a.tiles) !== null && _b !== void 0 ? _b : (_c = res.data) === null || _c === void 0 ? void 0 : _c.data) !== null && _d !== void 0 ? _d : [];
            if (!tiles.length) {
                throw new Error("No Tile trackers found on this account.");
            }
            const saved = [];
            for (const tile of tiles) {
                const existing = yield this.repo.findOne({
                    where: { externalDeviceId: tile.uuid, parentId },
                });
                if (existing) {
                    saved.push(existing);
                    continue;
                }
                const device = this.repo.create({
                    parentId,
                    platform: "tile",
                    deviceKind: "tracker",
                    deviceName: (_e = tile.name) !== null && _e !== void 0 ? _e : `Tile ${(_f = tile.tile_type) !== null && _f !== void 0 ? _f : "Tracker"}`,
                    externalDeviceId: tile.uuid,
                    accessToken: apiKey, // store api key as access token
                    refreshToken: email, // store email as refresh token for re-auth
                    isActive: true,
                    lastLocation: tile.last_tile_state
                        ? {
                            lat: (_g = tile.last_tile_state.latitude) !== null && _g !== void 0 ? _g : 0,
                            lng: (_h = tile.last_tile_state.longitude) !== null && _h !== void 0 ? _h : 0,
                            presence: tile.last_tile_state.is_lost ? "not present" : "present",
                            updatedAt: new Date((_j = tile.last_tile_state.timestamp) !== null && _j !== void 0 ? _j : Date.now()).toISOString(),
                        }
                        : null,
                });
                const s = yield this.repo.save(device);
                saved.push(s);
                console.log(`[SmartDevice] Tile tracker "${device.deviceName}" connected for parent ${parentId}`);
            }
            return saved;
        });
    }
    // ── Device management ──────────────────────────────────────────────────────
    getDevicesByParent(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.repo.find({
                where: { parentId, isActive: true },
                order: { createdAt: "ASC" },
            });
        });
    }
    removeDevice(id, parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const device = yield this.repo.findOne({ where: { id, parentId } });
            if (!device)
                throw new Error("Smart device not found");
            yield this.repo.remove(device);
        });
    }
    /**
     * Links a smart device to a child profile.
     * When that child is locked, this TV will be powered off automatically.
     */
    linkToChild(deviceId, childId, parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const device = yield this.repo.findOne({ where: { id: deviceId, parentId } });
            if (!device)
                throw new Error("Smart device not found");
            device.linkedChildId = childId;
            return this.repo.save(device);
        });
    }
    // ── Control ────────────────────────────────────────────────────────────────
    /**
     * Sends a power command to a specific smart device.
     * Handles token refresh for SmartThings automatically.
     *
     * @param deviceId  SmartDeviceEntity.id (our UUID)
     * @param action    "on" | "off"
     * @param parentId  Optional — if provided, ownership is verified
     */
    controlDevice(deviceId, action, parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const where = { id: deviceId, isActive: true };
            if (parentId)
                where.parentId = parentId;
            const device = yield this.repo.findOne({ where });
            if (!device)
                throw new Error("Smart device not found");
            yield this.sendCommand(device, action);
        });
    }
    /**
     * Finds the smart TV linked to a child profile and controls it.
     * Called automatically by ChildService.queueCommand() on LOCK/UNLOCK.
     * Fire-and-forget — errors are logged but not re-thrown.
     */
    controlByChild(childId, action) {
        return __awaiter(this, void 0, void 0, function* () {
            const device = yield this.repo.findOne({
                where: { linkedChildId: childId, isActive: true },
            });
            if (!device)
                return; // No TV linked — nothing to do
            yield this.sendCommand(device, action);
        });
    }
    // ── Internal: send command ─────────────────────────────────────────────────
    sendCommand(device, action) {
        return __awaiter(this, void 0, void 0, function* () {
            if (device.platform === "smartthings") {
                yield this.sendSmartThingsCommand(device, action);
            }
            else {
                yield this.sendHomeAssistantCommand(device, action);
            }
            // Record last action
            yield this.repo.update(device.id, {
                lastControlledAt: new Date(),
                lastAction: action,
            });
        });
    }
    sendSmartThingsCommand(device, action) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield this.getValidSmartThingsToken(device);
            yield axios_1.default.post(ST_COMMAND_URL(device.externalDeviceId), {
                commands: [
                    {
                        component: "main",
                        capability: "switch",
                        command: action === "off" ? "off" : "on",
                    },
                ],
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                timeout: 10000,
            });
            console.log(`[SmartDevice] SmartThings ${action.toUpperCase()} sent to "${device.deviceName}" (${device.externalDeviceId})`);
        });
    }
    sendHomeAssistantCommand(device, action) {
        return __awaiter(this, void 0, void 0, function* () {
            const base = device.baseUrl.replace(/\/$/, "");
            const service = action === "off" ? "media_player/turn_off" : "media_player/turn_on";
            yield axios_1.default.post(`${base}/api/services/${service}`, { entity_id: device.externalDeviceId }, {
                headers: {
                    Authorization: `Bearer ${device.accessToken}`,
                    "Content-Type": "application/json",
                },
                timeout: 10000,
            });
            console.log(`[SmartDevice] Home Assistant ${action.toUpperCase()} sent to "${device.deviceName}" (${device.externalDeviceId})`);
        });
    }
    // ── SmartThings token refresh ──────────────────────────────────────────────
    /**
     * Returns a valid SmartThings access token, refreshing it if it has expired
     * or will expire within the next 60 seconds.
     */
    getValidSmartThingsToken(device) {
        return __awaiter(this, void 0, void 0, function* () {
            const needsRefresh = !device.tokenExpiry ||
                device.tokenExpiry.getTime() - Date.now() < 60000;
            if (!needsRefresh)
                return device.accessToken;
            if (!device.refreshToken) {
                throw new Error(`SmartThings token for "${device.deviceName}" has expired and no refresh token is available. Please reconnect.`);
            }
            const clientId = process.env.SMARTTHINGS_CLIENT_ID;
            const clientSecret = process.env.SMARTTHINGS_CLIENT_SECRET;
            const res = yield axios_1.default.post(ST_TOKEN_URL, new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: device.refreshToken,
            }).toString(), {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: "Basic " +
                        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
                },
            });
            const { access_token, refresh_token, expires_in } = res.data;
            const tokenExpiry = new Date(Date.now() + expires_in * 1000);
            // Persist updated tokens
            yield this.repo.update(device.id, {
                accessToken: access_token,
                refreshToken: refresh_token,
                tokenExpiry,
            });
            console.log(`[SmartDevice] Refreshed SmartThings token for "${device.deviceName}"`);
            return access_token;
        });
    }
}
exports.SmartDeviceService = SmartDeviceService;
//# sourceMappingURL=smartDevice.service.js.map