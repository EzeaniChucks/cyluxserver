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
exports.aiController = exports.AiController = void 0;
const system_config_service_1 = require("../services/system-config.service");
const response_1 = require("../utils/response");
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
function buildPrompt(child) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const appUsageSummary = Array.isArray(child.appUsage) && child.appUsage.length
        ? child.appUsage
            .map((a) => { var _a; return `  - ${a.name}: ${a.timeSpentMinutes}m used${a.limitMinutes ? ` / ${a.limitMinutes}m limit` : ''} [${(_a = a.category) !== null && _a !== void 0 ? _a : 'uncategorised'}]`; })
            .join('\n')
        : '  No app usage data yet.';
    const schedulesSummary = Array.isArray(child.schedules) && child.schedules.length
        ? child.schedules
            .map((s) => `${s.day} ${s.startTime}–${s.endTime} (${s.active ? 'active' : 'disabled'})`)
            .join('; ')
        : 'none configured';
    const geofencesSummary = Array.isArray(child.geofences) && child.geofences.length
        ? child.geofences.map((g) => `${g.name} (${g.type}, radius ${g.radius}m)`).join('; ')
        : 'none configured';
    return `
Act as an MDM Compliance Auditor. Analyze the full telemetry from Managed Node: ${child.name}.

DEVICE TELEMETRY:
- Node Status: ${child.status}
- Compliance Status: ${child.complianceStatus}
- Platform: ${(_a = child.deviceType) !== null && _a !== void 0 ? _a : 'unknown'}
- Daily Screen Time: ${child.usedMinutes}m used / ${child.dailyLimitMinutes}m allowed
- Battery Health: ${child.battery}%
- Last Seen: ${(_b = child.lastSeen) !== null && _b !== void 0 ? _b : 'unknown'}
- Last Inventory Scan: ${(_c = child.lastInventoryScan) !== null && _c !== void 0 ? _c : 'never'}

ACTIVE POLICY:
- Blocked Apps: ${Array.isArray(child.blockedApps) && child.blockedApps.length ? child.blockedApps.join(', ') : 'none configured'}
- Web Filtering: Category filtering ${((_d = child.webFilter) === null || _d === void 0 ? void 0 : _d.categoryFiltering) ? 'ENABLED' : 'DISABLED'}
  · Blocked domains: ${((_f = (_e = child.webFilter) === null || _e === void 0 ? void 0 : _e.blockedDomains) === null || _f === void 0 ? void 0 : _f.length) ? child.webFilter.blockedDomains.join(', ') : 'none'}
  · Allowed domains: ${((_h = (_g = child.webFilter) === null || _g === void 0 ? void 0 : _g.allowedDomains) === null || _h === void 0 ? void 0 : _h.length) ? child.webFilter.allowedDomains.join(', ') : 'unrestricted'}
- Schedules: ${schedulesSummary}
- Geofences: ${geofencesSummary}

APP USAGE TODAY:
${appUsageSummary}

REPORT REQUIREMENTS:
1. Identify Security Risks (tampering, excessive usage, policy gaps, potential bypass attempts).
2. Compliance Suggestions for the Administrator based on the above policy and usage.
3. A "Node Compliance Score" (0-100) reflecting overall policy adherence and risk level.
4. A brief Executive Summary of the node's current threat and compliance landscape.
  `.trim();
}
class AiController {
    constructor() {
        /**
         * POST /api/ai/insights — parent-authenticated.
         * Proxies a Gemini AI compliance audit using the key stored in system config.
         * Records key health status after each call so the admin portal can surface issues.
         */
        this.getInsights = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            const child = req.body;
            if (!child || typeof child !== 'object') {
                return response_1.ApiResponse.error(res, 'Child data is required', 400);
            }
            const apiKey = yield system_config_service_1.systemConfigService.getGeminiKey();
            if (!apiKey) {
                yield system_config_service_1.systemConfigService.recordGeminiError('No Gemini API key configured');
                return response_1.ApiResponse.error(res, 'Gemini API key is not configured. Set it in the admin portal → System Config.', 503);
            }
            try {
                const geminiRes = yield fetch(`${GEMINI_URL}?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: buildPrompt(child) }] }],
                        generationConfig: {
                            responseMimeType: 'application/json',
                            responseSchema: {
                                type: 'object',
                                properties: {
                                    risks: { type: 'array', items: { type: 'string' } },
                                    suggestions: { type: 'array', items: { type: 'string' } },
                                    safetyScore: { type: 'number' },
                                    summary: { type: 'string' },
                                },
                                required: ['risks', 'suggestions', 'safetyScore', 'summary'],
                            },
                        },
                    }),
                });
                const data = yield geminiRes.json();
                if (data.error) {
                    const msg = (_b = (_a = data.error.message) !== null && _a !== void 0 ? _a : data.error.status) !== null && _b !== void 0 ? _b : 'Unknown Gemini error';
                    yield system_config_service_1.systemConfigService.recordGeminiError(msg);
                    console.error('[AI] Gemini error:', msg);
                    return response_1.ApiResponse.error(res, `Gemini API error: ${msg}`, 502);
                }
                const text = (_g = (_f = (_e = (_d = (_c = data.candidates) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.parts) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.text;
                if (!text) {
                    const blockReason = (_j = (_h = data.promptFeedback) === null || _h === void 0 ? void 0 : _h.blockReason) !== null && _j !== void 0 ? _j : 'unknown';
                    const msg = `No response from Gemini (blockReason: ${blockReason})`;
                    yield system_config_service_1.systemConfigService.recordGeminiError(msg);
                    return response_1.ApiResponse.error(res, msg, 502);
                }
                yield system_config_service_1.systemConfigService.recordGeminiSuccess();
                const parsed = JSON.parse(text);
                return response_1.ApiResponse.success(res, {
                    safetyScore: (_k = parsed.safetyScore) !== null && _k !== void 0 ? _k : 0,
                    summary: (_l = parsed.summary) !== null && _l !== void 0 ? _l : '',
                    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
                    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
                }, 'AI insights generated');
            }
            catch (err) {
                yield system_config_service_1.systemConfigService.recordGeminiError(err.message);
                return response_1.ApiResponse.error(res, err.message, 500);
            }
        });
    }
}
exports.AiController = AiController;
exports.aiController = new AiController();
//# sourceMappingURL=ai.controller.js.map