import { AppDataSource } from "../database";
import { NetworkProfileEntity } from "../entities/NetworkProfile";
import { ChildEntity } from "../entities/Child";
import { ParentEntity } from "../entities/Parent";
import https from "https";

const NEXTDNS_BASE = "https://api.nextdns.io";

// ── NextDNS HTTP helpers ───────────────────────────────────────────────────────

async function nextdnsRequest<T = any>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  apiKey: string,
  body?: object
): Promise<T> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${NEXTDNS_BASE}${path}`);
    const bodyStr = body ? JSON.stringify(body) : undefined;

    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
          "X-Api-Key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            return reject(
              new Error(`NextDNS ${res.statusCode}: ${data.slice(0, 200)}`)
            );
          }
          try {
            resolve(data ? JSON.parse(data) : ({} as T));
          } catch {
            resolve({} as T);
          }
        });
      }
    );
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns true if the string looks like a domain (not an Android package name). */
function isDomain(str: string): boolean {
  return (
    str.includes(".") &&
    !str.includes(" ") &&
    !str.startsWith("com.") &&
    !str.startsWith("org.") &&
    !str.startsWith("net.") &&
    !str.startsWith("io.") &&
    !/^[a-zA-Z]+\.[a-zA-Z]+\.[a-zA-Z]/.test(str) // skip triple-segment package names
  );
}

/** Collect all unique domains blocked across a parent's children. */
async function collectFamilyDomains(parentId: string): Promise<string[]> {
  const childRepo = AppDataSource.getRepository(ChildEntity);
  const children = await childRepo.find({
    where: { parent: { id: parentId } as any },
  });

  const domainSet = new Set<string>();
  for (const child of children) {
    if (!child.webFilter) continue;
    for (const d of child.webFilter.blockedDomains ?? []) {
      if (isDomain(d)) domainSet.add(d.toLowerCase());
    }
    for (const pkg of child.blockedApps ?? []) {
      if (isDomain(pkg)) domainSet.add(pkg.toLowerCase());
    }
  }
  return Array.from(domainSet);
}

// ── Service ────────────────────────────────────────────────────────────────────

export class NetworkService {
  private repo = AppDataSource.getRepository(NetworkProfileEntity);

  /** Get the profile, creating a blank record if it doesn't exist yet. */
  async getOrCreate(parentId: string): Promise<NetworkProfileEntity> {
    let profile = await this.repo.findOne({ where: { parentId } });
    if (!profile) {
      profile = this.repo.create({ parentId });
      await this.repo.save(profile);
    }
    return profile;
  }

  /** Verify an API key is valid by listing profiles. Returns first profile name. */
  async testConnection(
    apiKey: string
  ): Promise<{ ok: boolean; profileCount?: number }> {
    try {
      const res: { data: any[] } = await nextdnsRequest(
        "GET",
        "/profiles",
        apiKey
      );
      return { ok: true, profileCount: res.data?.length ?? 0 };
    } catch {
      return { ok: false };
    }
  }

  /**
   * Create a new NextDNS profile named "Cylux – <parentEmail>" and return its ID.
   */
  async createNextDnsProfile(
    apiKey: string,
    parentEmail: string
  ): Promise<string> {
    const res: { data: { id: string } } = await nextdnsRequest(
      "POST",
      "/profiles",
      apiKey,
      {
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
      }
    );
    return res.data.id;
  }

  /**
   * Fetch the linked IPv4 and IPv6 addresses for a NextDNS profile.
   * These are used as router DNS server addresses.
   */
  async getLinkedIps(
    apiKey: string,
    profileId: string
  ): Promise<{ ipv4: string[]; ipv6: string[] }> {
    try {
      const res: { data: { linkedIps: string[]; linkedIpv6s: string[] } } =
        await nextdnsRequest("GET", `/profiles/${profileId}/linkedips`, apiKey);
      return {
        ipv4: res.data?.linkedIps ?? [],
        ipv6: res.data?.linkedIpv6s ?? [],
      };
    } catch {
      // Fallback to shared NextDNS IPs (profile is identified via DOH/DOT)
      return { ipv4: ["45.90.28.0", "45.90.30.0"], ipv6: [] };
    }
  }

  /**
   * Sync the family's blocked domains to NextDNS denylist (delta update).
   * Returns the number of domains now in the denylist.
   */
  async syncDomains(parentId: string): Promise<number> {
    const profile = await this.repo.findOne({ where: { parentId } });
    if (!profile?.nextdnsApiKey || !profile.nextdnsProfileId || !profile.enabled) {
      return 0;
    }

    const { nextdnsApiKey: apiKey, nextdnsProfileId: profileId } = profile;
    const denylistPath = `/profiles/${profileId}/denylist`;

    // 1. Desired set = child domains + parent extras
    const childDomains = await collectFamilyDomains(parentId);
    const extras = profile.extraBlockedDomains ?? [];
    const desired = new Set(
      [...childDomains, ...extras].map((d) => d.toLowerCase())
    );

    // 2. Current NextDNS denylist
    let current: Set<string>;
    try {
      const res: { data: Array<{ id: string; active: boolean }> } =
        await nextdnsRequest("GET", denylistPath, apiKey);
      current = new Set((res.data ?? []).map((e) => e.id.toLowerCase()));
    } catch {
      current = new Set();
    }

    // 3. Add missing entries
    for (const domain of desired) {
      if (!current.has(domain)) {
        await nextdnsRequest("POST", denylistPath, apiKey, {
          id: domain,
          active: true,
        }).catch(() => null); // best-effort
      }
    }

    // 4. Remove stale entries (domains no longer blocked in Cylux)
    for (const domain of current) {
      if (!desired.has(domain)) {
        await nextdnsRequest(
          "DELETE",
          `${denylistPath}/${encodeURIComponent(domain)}`,
          apiKey
        ).catch(() => null);
      }
    }

    profile.lastSyncAt = new Date();
    profile.lastSyncCount = desired.size;
    await this.repo.save(profile);

    return desired.size;
  }

  /** Update a parent's network profile settings. */
  async update(
    parentId: string,
    data: Partial<
      Pick<
        NetworkProfileEntity,
        | "nextdnsApiKey"
        | "nextdnsProfileId"
        | "nextdnsProfileName"
        | "autoSync"
        | "enabled"
        | "extraBlockedDomains"
      >
    >
  ): Promise<NetworkProfileEntity> {
    const profile = await this.getOrCreate(parentId);
    Object.assign(profile, data);
    return this.repo.save(profile);
  }

  /** Return profile safe for API (mask the API key). */
  toPublic(profile: NetworkProfileEntity) {
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
      extraBlockedDomains: profile.extraBlockedDomains ?? [],
      lastSyncAt: profile.lastSyncAt,
      lastSyncCount: profile.lastSyncCount,
      updatedAt: profile.updatedAt,
    };
  }
}

export const networkService = new NetworkService();
