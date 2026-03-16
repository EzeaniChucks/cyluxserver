"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.networkController = void 0;
const network_service_1 = require("../services/network.service");
const response_1 = require("../utils/response");
exports.networkController = {
    /**
     * GET /api/network/profile
     * Return the authenticated parent's network profile (API key masked).
     */
    getProfile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const parentId = req.parentId;
                const profile = yield network_service_1.networkService.getOrCreate(parentId);
                return response_1.ApiResponse.success(res, network_service_1.networkService.toPublic(profile));
            }
            catch (e) {
                return response_1.ApiResponse.error(res, e.message, 500);
            }
        });
    },
    /**
     * PUT /api/network/profile
     * Update settings: apiKey, profileId, autoSync, enabled, extraBlockedDomains.
     */
    updateProfile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const parentId = req.parentId;
                const { nextdnsApiKey, nextdnsProfileId, nextdnsProfileName, autoSync, enabled, extraBlockedDomains, } = req.body;
                const profile = yield network_service_1.networkService.update(parentId, Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (nextdnsApiKey !== undefined ? { nextdnsApiKey } : {})), (nextdnsProfileId !== undefined ? { nextdnsProfileId } : {})), (nextdnsProfileName !== undefined ? { nextdnsProfileName } : {})), (autoSync !== undefined ? { autoSync } : {})), (enabled !== undefined ? { enabled } : {})), (extraBlockedDomains !== undefined ? { extraBlockedDomains } : {})));
                return response_1.ApiResponse.success(res, network_service_1.networkService.toPublic(profile));
            }
            catch (e) {
                return response_1.ApiResponse.error(res, e.message, 500);
            }
        });
    },
    /**
     * POST /api/network/profile/test
     * Body: { apiKey }
     * Verifies the NextDNS API key without saving it.
     */
    testConnection(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { apiKey } = req.body;
                if (!apiKey)
                    return response_1.ApiResponse.error(res, "apiKey required", 400);
                const result = yield network_service_1.networkService.testConnection(apiKey);
                if (!result.ok) {
                    return response_1.ApiResponse.error(res, "Invalid NextDNS API key", 401);
                }
                return response_1.ApiResponse.success(res, result);
            }
            catch (e) {
                return response_1.ApiResponse.error(res, e.message, 500);
            }
        });
    },
    /**
     * POST /api/network/profile/create-nextdns
     * Create a new NextDNS profile using the stored API key.
     * Returns the new profile ID.
     */
    createNextDnsProfile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const parentId = req.parentId;
                const parentRepo = (yield Promise.resolve().then(() => __importStar(require("../database")))).AppDataSource.getRepository((yield Promise.resolve().then(() => __importStar(require("../entities/Parent")))).ParentEntity);
                const parent = yield parentRepo.findOneBy({ id: parentId });
                if (!parent)
                    return response_1.ApiResponse.error(res, "Parent not found", 404);
                const profile = yield network_service_1.networkService.getOrCreate(parentId);
                if (!profile.nextdnsApiKey) {
                    return response_1.ApiResponse.error(res, "Save your NextDNS API key first", 400);
                }
                const newProfileId = yield network_service_1.networkService.createNextDnsProfile(profile.nextdnsApiKey, parent.email);
                const updated = yield network_service_1.networkService.update(parentId, {
                    nextdnsProfileId: newProfileId,
                    nextdnsProfileName: `Cylux – ${parent.email}`,
                    enabled: true,
                });
                // Kick off initial sync
                network_service_1.networkService.syncDomains(parentId).catch(() => null);
                return response_1.ApiResponse.success(res, Object.assign({ profileId: newProfileId }, network_service_1.networkService.toPublic(updated)), "NextDNS profile created");
            }
            catch (e) {
                return response_1.ApiResponse.error(res, e.message, 500);
            }
        });
    },
    /**
     * POST /api/network/profile/sync
     * Manually trigger a domain sync to NextDNS.
     */
    syncDomains(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const parentId = req.parentId;
                const count = yield network_service_1.networkService.syncDomains(parentId);
                return response_1.ApiResponse.success(res, { domainsSynced: count });
            }
            catch (e) {
                return response_1.ApiResponse.error(res, e.message, 500);
            }
        });
    },
    /**
     * GET /api/network/profile/setup-instructions
     * Returns DNS IPs + DOH/DOT hostnames for router configuration.
     */
    getSetupInstructions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            try {
                const parentId = req.parentId;
                const profile = yield network_service_1.networkService.getOrCreate(parentId);
                if (!profile.nextdnsApiKey || !profile.nextdnsProfileId) {
                    return response_1.ApiResponse.success(res, {
                        configured: false,
                        instructions: null,
                    });
                }
                const ips = yield network_service_1.networkService.getLinkedIps(profile.nextdnsApiKey, profile.nextdnsProfileId);
                return response_1.ApiResponse.success(res, {
                    configured: true,
                    profileId: profile.nextdnsProfileId,
                    dns: {
                        ipv4Primary: (_a = ips.ipv4[0]) !== null && _a !== void 0 ? _a : "45.90.28.0",
                        ipv4Secondary: (_b = ips.ipv4[1]) !== null && _b !== void 0 ? _b : "45.90.30.0",
                        ipv6Primary: (_c = ips.ipv6[0]) !== null && _c !== void 0 ? _c : null,
                        doh: `https://dns.nextdns.io/${profile.nextdnsProfileId}`,
                        dot: `${profile.nextdnsProfileId}.dns.nextdns.io`,
                    },
                    steps: {
                        general: [
                            "Log in to your home router's admin panel (usually at 192.168.1.1 or 192.168.0.1)",
                            "Find the DNS settings (often under WAN, Internet, or DHCP settings)",
                            `Set Primary DNS to: ${(_d = ips.ipv4[0]) !== null && _d !== void 0 ? _d : "45.90.28.0"}`,
                            `Set Secondary DNS to: ${(_e = ips.ipv4[1]) !== null && _e !== void 0 ? _e : "45.90.30.0"}`,
                            "Save and restart the router",
                            "All devices on your network — including Roku, smart TVs, and gaming consoles — will now be filtered",
                        ],
                        doH: `For devices that support DNS-over-HTTPS, use: https://dns.nextdns.io/${profile.nextdnsProfileId}`,
                        note: "Devices that manually override their own DNS settings will bypass router-level filtering. For those, install the Cylux app directly on the device.",
                    },
                });
            }
            catch (e) {
                return response_1.ApiResponse.error(res, e.message, 500);
            }
        });
    },
};
//# sourceMappingURL=network.controller.js.map