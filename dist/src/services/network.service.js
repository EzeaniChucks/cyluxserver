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
exports.networkService = exports.NetworkService = void 0;
const database_1 = require("../database");
const NetworkProfile_1 = require("../entities/NetworkProfile");
const Child_1 = require("../entities/Child");
const https_1 = __importDefault(require("https"));
const NEXTDNS_BASE = "https://api.nextdns.io";
// ── NextDNS HTTP helpers ───────────────────────────────────────────────────────
function nextdnsRequest(method, path, apiKey, body) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const url = new URL(`${NEXTDNS_BASE}${path}`);
            const bodyStr = body ? JSON.stringify(body) : undefined;
            const req = https_1.default.request({
                hostname: url.hostname,
                path: url.pathname + url.search,
                method,
                headers: Object.assign({ "X-Api-Key": apiKey, "Content-Type": "application/json", Accept: "application/json" }, (bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {})),
            }, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        return reject(new Error(`NextDNS ${res.statusCode}: ${data.slice(0, 200)}`));
                    }
                    try {
                        resolve(data ? JSON.parse(data) : {});
                    }
                    catch (_a) {
                        resolve({});
                    }
                });
            });
            req.on("error", reject);
            if (bodyStr)
                req.write(bodyStr);
            req.end();
        });
    });
}
// ── Helpers ────────────────────────────────────────────────────────────────────
/** Returns true if the string looks like a domain (not an Android package name). */
function isDomain(str) {
    return (str.includes(".") &&
        !str.includes(" ") &&
        !str.startsWith("com.") &&
        !str.startsWith("org.") &&
        !str.startsWith("net.") &&
        !str.startsWith("io.") &&
        !/^[a-zA-Z]+\.[a-zA-Z]+\.[a-zA-Z]/.test(str) // skip triple-segment package names
    );
}
/** Collect all unique domains blocked across a parent's children. */
function collectFamilyDomains(parentId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const childRepo = database_1.AppDataSource.getRepository(Child_1.ChildEntity);
        const children = yield childRepo.find({
            where: { parent: { id: parentId } },
        });
        const domainSet = new Set();
        for (const child of children) {
            if (!child.webFilter)
                continue;
            for (const d of (_a = child.webFilter.blockedDomains) !== null && _a !== void 0 ? _a : []) {
                if (isDomain(d))
                    domainSet.add(d.toLowerCase());
            }
            for (const pkg of (_b = child.blockedApps) !== null && _b !== void 0 ? _b : []) {
                if (isDomain(pkg))
                    domainSet.add(pkg.toLowerCase());
            }
        }
        return Array.from(domainSet);
    });
}
// ── Service ────────────────────────────────────────────────────────────────────
class NetworkService {
    constructor() {
        this.repo = database_1.AppDataSource.getRepository(NetworkProfile_1.NetworkProfileEntity);
    }
    /** Get the profile, creating a blank record if it doesn't exist yet. */
    getOrCreate(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            let profile = yield this.repo.findOne({ where: { parentId } });
            if (!profile) {
                profile = this.repo.create({ parentId });
                yield this.repo.save(profile);
            }
            return profile;
        });
    }
    /** Verify an API key is valid by listing profiles. Returns first profile name. */
    testConnection(apiKey) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const res = yield nextdnsRequest("GET", "/profiles", apiKey);
                return { ok: true, profileCount: (_b = (_a = res.data) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0 };
            }
            catch (_c) {
                return { ok: false };
            }
        });
    }
    /**
     * Create a new NextDNS profile named "Cylux – <parentEmail>" and return its ID.
     */
    createNextDnsProfile(apiKey, parentEmail) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield nextdnsRequest("POST", "/profiles", apiKey, {
                name: `Cylux – ${parentEmail}`,
                security: {
                    threatIntelligenceFeeds: true,
                    aiThreatDetection: true,
                    googleSafeBrowsing: true,
                    cryptojacking: true,
                    dnsRebinding: true,
                    idnHomographs: true,
                    typosquatting: true,
                    dga: true,
                    nrd: false,
                    ddns: false,
                    parking: true,
                    csam: true,
                },
                privacy: {
                    disguisedTrackers: true,
                    allowAffiliate: false,
                },
                parentalControl: {
                    safeSearch: false,
                    youtubeRestrictedMode: false,
                    blockBypass: true,
                },
            });
            return res.data.id;
        });
    }
    /**
     * Fetch the linked IPv4 and IPv6 addresses for a NextDNS profile.
     * These are used as router DNS server addresses.
     */
    getLinkedIps(apiKey, profileId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const res = yield nextdnsRequest("GET", `/profiles/${profileId}/linkedips`, apiKey);
                return {
                    ipv4: (_b = (_a = res.data) === null || _a === void 0 ? void 0 : _a.linkedIps) !== null && _b !== void 0 ? _b : [],
                    ipv6: (_d = (_c = res.data) === null || _c === void 0 ? void 0 : _c.linkedIpv6s) !== null && _d !== void 0 ? _d : [],
                };
            }
            catch (_e) {
                // Fallback to shared NextDNS IPs (profile is identified via DOH/DOT)
                return { ipv4: ["45.90.28.0", "45.90.30.0"], ipv6: [] };
            }
        });
    }
    /**
     * Sync the family's blocked domains to NextDNS denylist (delta update).
     * Returns the number of domains now in the denylist.
     */
    syncDomains(parentId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const profile = yield this.repo.findOne({ where: { parentId } });
            if (!(profile === null || profile === void 0 ? void 0 : profile.nextdnsApiKey) || !profile.nextdnsProfileId || !profile.enabled) {
                return 0;
            }
            const { nextdnsApiKey: apiKey, nextdnsProfileId: profileId } = profile;
            const denylistPath = `/profiles/${profileId}/denylist`;
            // 1. Desired set = child domains + parent extras
            const childDomains = yield collectFamilyDomains(parentId);
            const extras = (_a = profile.extraBlockedDomains) !== null && _a !== void 0 ? _a : [];
            const desired = new Set([...childDomains, ...extras].map((d) => d.toLowerCase()));
            // 2. Current NextDNS denylist
            let current;
            try {
                const res = yield nextdnsRequest("GET", denylistPath, apiKey);
                current = new Set(((_b = res.data) !== null && _b !== void 0 ? _b : []).map((e) => e.id.toLowerCase()));
            }
            catch (_c) {
                current = new Set();
            }
            // 3. Add missing entries
            for (const domain of desired) {
                if (!current.has(domain)) {
                    yield nextdnsRequest("POST", denylistPath, apiKey, {
                        id: domain,
                        active: true,
                    }).catch(() => null); // best-effort
                }
            }
            // 4. Remove stale entries (domains no longer blocked in Cylux)
            for (const domain of current) {
                if (!desired.has(domain)) {
                    yield nextdnsRequest("DELETE", `${denylistPath}/${encodeURIComponent(domain)}`, apiKey).catch(() => null);
                }
            }
            profile.lastSyncAt = new Date();
            profile.lastSyncCount = desired.size;
            yield this.repo.save(profile);
            return desired.size;
        });
    }
    /** Update a parent's network profile settings. */
    update(parentId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const profile = yield this.getOrCreate(parentId);
            Object.assign(profile, data);
            return this.repo.save(profile);
        });
    }
    /** Return profile safe for API (mask the API key). */
    toPublic(profile) {
        var _a;
        return {
            id: profile.id,
            nextdnsProfileId: profile.nextdnsProfileId,
            nextdnsProfileName: profile.nextdnsProfileName,
            hasApiKey: !!profile.nextdnsApiKey,
            apiKeyMasked: profile.nextdnsApiKey
                ? `${"*".repeat(Math.max(0, profile.nextdnsApiKey.length - 4))}${profile.nextdnsApiKey.slice(-4)}`
                : null,
            autoSync: profile.autoSync,
            enabled: profile.enabled,
            extraBlockedDomains: (_a = profile.extraBlockedDomains) !== null && _a !== void 0 ? _a : [],
            lastSyncAt: profile.lastSyncAt,
            lastSyncCount: profile.lastSyncCount,
            updatedAt: profile.updatedAt,
        };
    }
}
exports.NetworkService = NetworkService;
exports.networkService = new NetworkService();
//# sourceMappingURL=network.service.js.map