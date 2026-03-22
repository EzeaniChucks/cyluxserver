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
exports.aiController = exports.AiController = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const system_config_service_1 = require("../services/system-config.service");
const response_1 = require("../utils/response");
const database_1 = require("../database");
const Child_1 = require("../entities/Child");
// The Cylux monitoring app package. It runs as a persistent background service so it
// will always appear in Android UsageStats. We include it in reports but give Claude
// the context it needs to interpret the minutes correctly.
const CYLUX_PACKAGE = 'com.cyluxchild';
function buildPrompt(child) {
    var _a, _b, _c, _d, _e, _f, _g;
    const blockedSet = new Set(Array.isArray(child.blockedApps) ? child.blockedApps : []);
    // Cap to top 20 to keep prompt size reasonable.
    const reportableApps = (Array.isArray(child.appUsage) ? child.appUsage : []).slice(0, 20);
    // Split into unrestricted apps vs currently-blocked apps that have some recorded usage.
    // IMPORTANT: A blocked app can legitimately show usage if the parent applied the block
    // partway through the day — the usage was recorded BEFORE the block took effect.
    const unrestrictedApps = reportableApps.filter((a) => !blockedSet.has(a.packageName));
    const blockedAppsWithUsage = reportableApps.filter((a) => blockedSet.has(a.packageName) && a.timeSpentMinutes > 0);
    const formatApp = (a) => {
        var _a;
        const isCylux = a.packageName === CYLUX_PACKAGE;
        const note = isCylux ? ' [this is the parental monitoring app — background service time is always counted]' : '';
        return `  - ${a.name} (${a.packageName}): ${a.timeSpentMinutes}m${a.limitMinutes ? ` / ${a.limitMinutes}m limit` : ''} [${(_a = a.category) !== null && _a !== void 0 ? _a : 'uncategorised'}]${note}`;
    };
    const unrestrictedSummary = unrestrictedApps.length
        ? unrestrictedApps.map(formatApp).join('\n')
        : '  No unrestricted app usage recorded.';
    const blockedUsageSummary = blockedAppsWithUsage.length
        ? blockedAppsWithUsage.map(formatApp).join('\n')
        : '  None — all currently blocked apps show 0 usage (blocks are effective).';
    // Determine data freshness so Claude can contextualise the usage correctly.
    const lastSeenDate = child.lastSeen ? new Date(child.lastSeen) : null;
    const today = new Date();
    const isStale = lastSeenDate
        ? lastSeenDate.toDateString() !== today.toDateString()
        : true;
    const usageLabel = isStale && lastSeenDate
        ? `APP USAGE (from last sync on ${lastSeenDate.toDateString()} — device is currently offline)`
        : 'APP USAGE TODAY';
    const schedulesSummary = Array.isArray(child.schedules) && child.schedules.length
        ? child.schedules
            .map((s) => `${s.day} ${s.startTime}–${s.endTime} (${s.active ? 'active' : 'disabled'})`)
            .join('; ')
        : 'none configured';
    const geofencesSummary = Array.isArray(child.geofences) && child.geofences.length
        ? child.geofences.map((g) => `${g.name} (${g.type}, radius ${g.radius}m)`).join('; ')
        : 'none configured';
    return `
Act as a child-safety analyst for a parental control app. Analyze the data for ${child.name}'s device.

DEVICE INFO:
- Status: ${child.status}
- Platform: ${(_a = child.deviceType) !== null && _a !== void 0 ? _a : 'unknown'}
- Screen Time: ${child.usedMinutes}m used / ${child.dailyLimitMinutes}m daily limit
- Battery: ${child.battery}%
- Last Online: ${(_b = child.lastSeen) !== null && _b !== void 0 ? _b : 'unknown'}${isStale ? ' (offline — data below is from last sync)' : ''}

CURRENT RULES SET BY PARENT:
- Blocked Apps (${blockedSet.size}): ${blockedSet.size > 0 ? [...blockedSet].slice(0, 30).join(', ') : 'none configured'}
- Web Filtering: Category filtering ${((_c = child.webFilter) === null || _c === void 0 ? void 0 : _c.categoryFiltering) ? 'ON' : 'OFF'}
  · Blocked domains: ${((_e = (_d = child.webFilter) === null || _d === void 0 ? void 0 : _d.blockedDomains) === null || _e === void 0 ? void 0 : _e.length) ? child.webFilter.blockedDomains.slice(0, 20).join(', ') : 'none'}
  · Allowed domains: ${((_g = (_f = child.webFilter) === null || _f === void 0 ? void 0 : _f.allowedDomains) === null || _g === void 0 ? void 0 : _g.length) ? child.webFilter.allowedDomains.slice(0, 20).join(', ') : 'unrestricted'}
- Schedules: ${schedulesSummary}
- Geofences: ${geofencesSummary}

${usageLabel} — UNRESTRICTED APPS:
${unrestrictedSummary}

${usageLabel} — CURRENTLY BLOCKED APPS (usage below predates the block being applied):
${blockedUsageSummary}
Note: If the device is offline, the blocked apps shown above recorded this usage before the block was set or before the device last synced. The block IS active — usage will drop to 0 when the device next comes online. Only flag as a genuine concern if there is strong reason to believe the child circumvented the block.
Note: com.cyluxchild is the parental monitoring app running on the device — its minutes reflect the monitoring service being active, not the child using it, unless explicitly noted otherwise.

REPORT REQUIREMENTS:
1. Identify genuine safety concerns for a parent (inappropriate apps, excessive screen time, missing rules, etc.).
2. Give practical suggestions the parent can act on right now.
3. A Child Safety Score (0-100): 100 = no concerns, lower = real issues found.
4. A short, plain-English summary a parent can understand at a glance.
  `.trim();
}
class AiController {
    constructor() {
        /**
         * POST /api/ai/insights — parent-authenticated.
         * Returns a cached report if one was generated today (UTC); otherwise calls Claude,
         * stores the result on the child row, and returns it. This limits API usage to once
         * per child per day regardless of how many times a parent refreshes the page.
         */
        this.getInsights = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const child = req.body;
            if (!child || typeof child !== 'object') {
                return response_1.ApiResponse.error(res, 'Child data is required', 400);
            }
            // Cache key: date + prompt version. Bump PROMPT_VERSION when the prompt logic
            // changes so stale cached reports are automatically regenerated.
            const PROMPT_VERSION = 'v3';
            const today = `${new Date().toISOString().slice(0, 10)}-${PROMPT_VERSION}`; // YYYY-MM-DD-vN
            // Ownership check + cache lookup. Verify the requesting parent owns this child
            // before reading or writing any cached report (prevents IDOR).
            if (child.id) {
                try {
                    const parentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                    const childRepo = database_1.AppDataSource.getRepository(Child_1.ChildEntity);
                    const childEntity = yield childRepo.findOne({
                        where: { id: child.id, parent: { id: parentId } },
                    });
                    if (!childEntity) {
                        return response_1.ApiResponse.error(res, 'Child not found or unauthorized', 403);
                    }
                    if (childEntity.aiReportDate === today && childEntity.aiReport) {
                        return response_1.ApiResponse.success(res, childEntity.aiReport, 'AI insights (cached)');
                    }
                }
                catch (_f) {
                    // DB error — fall through and generate a fresh report
                }
            }
            const apiKey = yield system_config_service_1.systemConfigService.getClaudeKey();
            if (!apiKey) {
                yield system_config_service_1.systemConfigService.recordClaudeError('No Claude API key configured');
                return response_1.ApiResponse.error(res, 'Claude API key is not configured. Set it in the admin portal → System Config.', 503);
            }
            try {
                const client = new sdk_1.default({ apiKey });
                const message = yield client.messages.create({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 2048,
                    system: 'You are a child safety analyst for a parental control app. Your audience is parents, not IT professionals. ' +
                        'Write in clear, calm, parent-friendly language. ' +
                        'Never use MDM jargon like "node", "telemetry", "remediation", "forensic audit", or "MDM agent compromise". ' +
                        'Do not flag a currently-blocked app\'s historical usage as tampering — it is normal for a blocked app to show usage from earlier in the day before the block was applied. ' +
                        'Respond only with a JSON object containing exactly these keys: ' +
                        '"risks" (array of strings), "suggestions" (array of strings), "safetyScore" (number 0-100), "summary" (string). ' +
                        'No explanation, no markdown, no code fences — only the raw JSON object.',
                    messages: [{ role: 'user', content: buildPrompt(child) }],
                });
                const text = ((_b = message.content[0]) === null || _b === void 0 ? void 0 : _b.type) === 'text' ? message.content[0].text : '';
                if (!text) {
                    const msg = 'No response from Claude';
                    yield system_config_service_1.systemConfigService.recordClaudeError(msg);
                    return response_1.ApiResponse.error(res, msg, 502);
                }
                yield system_config_service_1.systemConfigService.recordClaudeSuccess();
                const parsed = JSON.parse(text);
                const report = {
                    safetyScore: (_c = parsed.safetyScore) !== null && _c !== void 0 ? _c : 0,
                    summary: (_d = parsed.summary) !== null && _d !== void 0 ? _d : '',
                    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
                    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
                };
                // Persist report so subsequent requests today are served from cache.
                // Ownership was already verified above; use the same parent filter to be safe.
                if (child.id) {
                    try {
                        const parentId = (_e = req.user) === null || _e === void 0 ? void 0 : _e.id;
                        const childRepo = database_1.AppDataSource.getRepository(Child_1.ChildEntity);
                        yield childRepo.update({ id: child.id, parent: { id: parentId } }, { aiReport: report, aiReportDate: today });
                    }
                    catch (_g) {
                        // Non-fatal — we still return the report to the parent
                    }
                }
                return response_1.ApiResponse.success(res, report, 'AI insights generated');
            }
            catch (err) {
                yield system_config_service_1.systemConfigService.recordClaudeError(err.message);
                return response_1.ApiResponse.error(res, err.message, 500);
            }
        });
        /**
         * GET /api/ai/safety-pulse — parent-authenticated.
         * Returns a brief summary of current digital safety risks for children,
         * generated by Claude based on its training knowledge.
         */
        this.getSafetyPulse = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const apiKey = yield system_config_service_1.systemConfigService.getClaudeKey();
            if (!apiKey) {
                return response_1.ApiResponse.success(res, {
                    text: 'AI safety pulse unavailable — Claude API key not configured.',
                    sources: [],
                }, 'Safety pulse');
            }
            try {
                const client = new sdk_1.default({ apiKey });
                const message = yield client.messages.create({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 512,
                    messages: [{
                            role: 'user',
                            content: 'Identify the top 3 trending digital safety risks or dangerous social media challenges for children today. ' +
                                'Be concise and specific. Each risk should be one sentence.',
                        }],
                });
                const text = ((_a = message.content[0]) === null || _a === void 0 ? void 0 : _a.type) === 'text' ? message.content[0].text : 'Analyzing safety trends...';
                return response_1.ApiResponse.success(res, { text, sources: [] }, 'Safety pulse');
            }
            catch (err) {
                return response_1.ApiResponse.success(res, { text: 'Analyzing safety trends...', sources: [] }, 'Safety pulse');
            }
        });
    }
}
exports.AiController = AiController;
exports.aiController = new AiController();
//# sourceMappingURL=ai.controller.js.map