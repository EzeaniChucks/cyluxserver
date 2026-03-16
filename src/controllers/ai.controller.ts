import { Request, Response } from 'express';
import { systemConfigService } from '../services/system-config.service';
import { ApiResponse } from '../utils/response';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function buildPrompt(child: Record<string, any>): string {
  const appUsageSummary =
    Array.isArray(child.appUsage) && child.appUsage.length
      ? child.appUsage
          .map(
            (a: any) =>
              `  - ${a.name}: ${a.timeSpentMinutes}m used${a.limitMinutes ? ` / ${a.limitMinutes}m limit` : ''} [${a.category ?? 'uncategorised'}]`,
          )
          .join('\n')
      : '  No app usage data yet.';

  const schedulesSummary =
    Array.isArray(child.schedules) && child.schedules.length
      ? child.schedules
          .map((s: any) => `${s.day} ${s.startTime}–${s.endTime} (${s.active ? 'active' : 'disabled'})`)
          .join('; ')
      : 'none configured';

  const geofencesSummary =
    Array.isArray(child.geofences) && child.geofences.length
      ? child.geofences.map((g: any) => `${g.name} (${g.type}, radius ${g.radius}m)`).join('; ')
      : 'none configured';

  return `
Act as an MDM Compliance Auditor. Analyze the full telemetry from Managed Node: ${child.name}.

DEVICE TELEMETRY:
- Node Status: ${child.status}
- Compliance Status: ${child.complianceStatus}
- Platform: ${child.deviceType ?? 'unknown'}
- Daily Screen Time: ${child.usedMinutes}m used / ${child.dailyLimitMinutes}m allowed
- Battery Health: ${child.battery}%
- Last Seen: ${child.lastSeen ?? 'unknown'}
- Last Inventory Scan: ${child.lastInventoryScan ?? 'never'}

ACTIVE POLICY:
- Blocked Apps: ${Array.isArray(child.blockedApps) && child.blockedApps.length ? child.blockedApps.join(', ') : 'none configured'}
- Web Filtering: Category filtering ${child.webFilter?.categoryFiltering ? 'ENABLED' : 'DISABLED'}
  · Blocked domains: ${child.webFilter?.blockedDomains?.length ? child.webFilter.blockedDomains.join(', ') : 'none'}
  · Allowed domains: ${child.webFilter?.allowedDomains?.length ? child.webFilter.allowedDomains.join(', ') : 'unrestricted'}
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

export class AiController {
  /**
   * POST /api/ai/insights — parent-authenticated.
   * Proxies a Gemini AI compliance audit using the key stored in system config.
   * Records key health status after each call so the admin portal can surface issues.
   */
  getInsights = async (req: any, res: Response) => {
    const child = req.body;
    if (!child || typeof child !== 'object') {
      return ApiResponse.error(res, 'Child data is required', 400);
    }

    const apiKey = await systemConfigService.getGeminiKey();
    if (!apiKey) {
      await systemConfigService.recordGeminiError('No Gemini API key configured');
      return ApiResponse.error(res, 'Gemini API key is not configured. Set it in the admin portal → System Config.', 503);
    }

    try {
      const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
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

      const data = await geminiRes.json();

      if (data.error) {
        const msg = data.error.message ?? data.error.status ?? 'Unknown Gemini error';
        await systemConfigService.recordGeminiError(msg);
        console.error('[AI] Gemini error:', msg);
        return ApiResponse.error(res, `Gemini API error: ${msg}`, 502);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        const blockReason = data.promptFeedback?.blockReason ?? 'unknown';
        const msg = `No response from Gemini (blockReason: ${blockReason})`;
        await systemConfigService.recordGeminiError(msg);
        return ApiResponse.error(res, msg, 502);
      }

      await systemConfigService.recordGeminiSuccess();

      const parsed = JSON.parse(text);
      return ApiResponse.success(res, {
        safetyScore: parsed.safetyScore ?? 0,
        summary: parsed.summary ?? '',
        risks: Array.isArray(parsed.risks) ? parsed.risks : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      }, 'AI insights generated');
    } catch (err: any) {
      await systemConfigService.recordGeminiError(err.message);
      return ApiResponse.error(res, err.message, 500);
    }
  };
}

export const aiController = new AiController();
