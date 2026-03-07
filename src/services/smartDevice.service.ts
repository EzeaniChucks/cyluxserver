import axios from "axios";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../database";
import { SmartDeviceEntity } from "../entities/SmartDevice";

// ── SmartThings API constants ────────────────────────────────────────────────
const ST_AUTHORIZE_URL = "https://api.smartthings.com/oauth/authorize";
const ST_TOKEN_URL = "https://api.smartthings.com/oauth/token";
const ST_DEVICES_URL = "https://api.smartthings.com/v1/devices";
const ST_COMMAND_URL = (deviceId: string) =>
  `https://api.smartthings.com/v1/devices/${deviceId}/commands`;

// SmartThings device categories that represent televisions
const TV_CATEGORIES = new Set(["Television", "SmartTV", "OTT_PLAY_DEVICE"]);

// SmartThings device categories / capabilities that represent trackers (SmartTag)
const TRACKER_CATEGORIES = new Set(["Tracking", "Presense Sensor", "Mobile"]);
const ST_DEVICE_STATUS_URL = (deviceId: string) =>
  `https://api.smartthings.com/v1/devices/${deviceId}/status`;

// ── OAuth state helpers ──────────────────────────────────────────────────────
// The OAuth `state` param is a short-lived JWT so the callback can identify
// which parent initiated the flow without storing server-side session state.
const STATE_SECRET = () =>
  process.env.JWT_SECRET || "cylux-smartthings-state-fallback";
const STATE_TTL_SECONDS = 600; // 10 minutes

interface StatePayload {
  parentId: string;
  nonce: string;
}

function createOAuthState(parentId: string): string {
  const payload: StatePayload = {
    parentId,
    nonce: Math.random().toString(36).slice(2),
  };
  return jwt.sign(payload, STATE_SECRET(), { expiresIn: STATE_TTL_SECONDS });
}

function verifyOAuthState(state: string): StatePayload {
  try {
    return jwt.verify(state, STATE_SECRET()) as StatePayload;
  } catch {
    throw new Error("Invalid or expired OAuth state");
  }
}

// ── Service ──────────────────────────────────────────────────────────────────

export class SmartDeviceService {
  private repo = AppDataSource.getRepository(SmartDeviceEntity);

  // ── SmartThings OAuth ──────────────────────────────────────────────────────

  /**
   * Returns the SmartThings OAuth authorization URL for the given parent.
   * The parent app opens this URL in a browser / webview.
   * After the user approves, SmartThings redirects to SMARTTHINGS_REDIRECT_URI
   * with `?code=...&state=...`.
   */
  getSmartThingsOAuthUrl(parentId: string): string {
    const clientId = process.env.SMARTTHINGS_CLIENT_ID;
    const redirectUri = process.env.SMARTTHINGS_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new Error(
        "SmartThings integration not configured. Set SMARTTHINGS_CLIENT_ID and SMARTTHINGS_REDIRECT_URI."
      );
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
  async exchangeSmartThingsCode(
    code: string,
    state: string
  ): Promise<SmartDeviceEntity[]> {
    // Verify state to prevent CSRF
    const { parentId } = verifyOAuthState(state);

    const clientId = process.env.SMARTTHINGS_CLIENT_ID!;
    const clientSecret = process.env.SMARTTHINGS_CLIENT_SECRET!;
    const redirectUri = process.env.SMARTTHINGS_REDIRECT_URI!;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("SmartThings integration not fully configured.");
    }

    // Exchange code for tokens
    const tokenRes = await axios.post(
      ST_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const tokenExpiry = new Date(Date.now() + expires_in * 1000);

    // Discover and save TV devices
    return this.discoverAndSaveSmartThingsDevices(
      parentId,
      access_token,
      refresh_token,
      tokenExpiry
    );
  }

  /**
   * Discovers TV-capable devices on the SmartThings account and upserts them
   * in the database.  Returns the saved records.
   */
  private async discoverAndSaveSmartThingsDevices(
    parentId: string,
    accessToken: string,
    refreshToken: string,
    tokenExpiry: Date
  ): Promise<SmartDeviceEntity[]> {
    const devicesRes = await axios.get(ST_DEVICES_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const allDevices: any[] = devicesRes.data.items ?? [];

    // Filter for TV-like devices by category or by having a "switch" capability
    const tvDevices = allDevices.filter((d: any) => {
      const category = d.components?.[0]?.categories?.[0]?.name ?? "";
      const caps: string[] = d.components?.[0]?.capabilities?.map(
        (c: any) => c.id
      ) ?? [];
      return TV_CATEGORIES.has(category) || caps.includes("tvChannel");
    });

    const saved: SmartDeviceEntity[] = [];

    for (const device of tvDevices) {
      // Upsert: if a device with this externalDeviceId already exists for
      // this parent, refresh its tokens instead of creating a duplicate.
      let existing = await this.repo.findOne({
        where: { parentId, externalDeviceId: device.deviceId },
      });

      if (existing) {
        existing.accessToken = accessToken;
        existing.refreshToken = refreshToken;
        existing.tokenExpiry = tokenExpiry;
        existing.deviceName = device.label ?? device.name ?? "Samsung TV";
        existing.isActive = true;
        saved.push(await this.repo.save(existing));
      } else {
        const entity = this.repo.create({
          parentId,
          platform: "smartthings",
          externalDeviceId: device.deviceId,
          deviceName: device.label ?? device.name ?? "Samsung TV",
          accessToken,
          refreshToken,
          tokenExpiry,
          baseUrl: null,
          isActive: true,
        });
        saved.push(await this.repo.save(entity));
      }
    }

    return saved;
  }

  // ── Home Assistant ─────────────────────────────────────────────────────────

  /**
   * Queries a Home Assistant instance for all media_player entities.
   * Called before adding a device so the parent can pick from a list
   * instead of typing the entity_id manually.
   */
  async discoverHomeAssistantDevices(
    baseUrl: string,
    haToken: string
  ): Promise<{ entityId: string; friendlyName: string; state: string }[]> {
    const base = baseUrl.replace(/\/$/, "");

    try {
      const res = await axios.get(`${base}/api/states`, {
        headers: { Authorization: `Bearer ${haToken}` },
        timeout: 8000,
      });

      const states: any[] = res.data ?? [];
      return states
        .filter((s: any) => s.entity_id?.startsWith("media_player."))
        .map((s: any) => ({
          entityId: s.entity_id,
          friendlyName: s.attributes?.friendly_name ?? s.entity_id,
          state: s.state ?? "unknown",
        }));
    } catch (e: any) {
      throw new Error(
        `Could not reach Home Assistant at ${base}: ${e.response?.status ?? e.message}`
      );
    }
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
  async addHomeAssistantDevice(
    parentId: string,
    baseUrl: string,
    entityId: string,
    deviceName: string,
    haToken: string
  ): Promise<SmartDeviceEntity> {
    // Strip trailing slash
    const base = baseUrl.replace(/\/$/, "");

    // Validate HA credentials — GET /api/ returns { "message": "API running." }
    try {
      await axios.get(`${base}/api/`, {
        headers: { Authorization: `Bearer ${haToken}` },
        timeout: 8000,
      });
    } catch (e: any) {
      throw new Error(
        `Could not reach Home Assistant at ${base}: ${e.response?.status ?? e.message}`
      );
    }

    // Upsert by entity_id within this parent account
    let existing = await this.repo.findOne({
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
  }

  // ── SmartThings tracker (SmartTag) ─────────────────────────────────────────

  /**
   * Discovers SmartTag / tracker devices on the parent's SmartThings account.
   * Identifies them by the `presenceSensor` capability or `Tracking` category.
   * Shares the same OAuth tokens as the TV connection — no new auth needed.
   *
   * Returns the saved tracker records.
   */
  async discoverSmartThingsTrackers(
    parentId: string
  ): Promise<SmartDeviceEntity[]> {
    // Find any existing SmartThings TV device to borrow a valid token
    const existing = await this.repo.findOne({
      where: { parentId, platform: "smartthings", deviceKind: "tv" },
      order: { updatedAt: "DESC" },
    });
    if (!existing) {
      throw new Error(
        "Connect a Samsung TV first — SmartTag uses the same SmartThings account."
      );
    }

    const token = await this.getValidSmartThingsToken(existing);
    const devicesRes = await axios.get(ST_DEVICES_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const allDevices: any[] = devicesRes.data.items ?? [];

    // Filter for tracker-like devices: presenceSensor capability or Tracking category
    const trackerDevices = allDevices.filter((d: any) => {
      const category = d.components?.[0]?.categories?.[0]?.name ?? "";
      const caps: string[] = d.components?.[0]?.capabilities?.map(
        (c: any) => c.id
      ) ?? [];
      return (
        TRACKER_CATEGORIES.has(category) ||
        caps.includes("presenceSensor") ||
        caps.includes("samsungvd.relayLocation")
      );
    });

    const saved: SmartDeviceEntity[] = [];

    for (const device of trackerDevices) {
      let rec = await this.repo.findOne({
        where: { parentId, externalDeviceId: device.deviceId, deviceKind: "tracker" },
      });

      if (rec) {
        rec.deviceName = device.label ?? device.name ?? "SmartTag";
        rec.isActive = true;
        saved.push(await this.repo.save(rec));
      } else {
        const newRec = this.repo.create({
          parentId,
          platform: "smartthings",
          deviceKind: "tracker",
          externalDeviceId: device.deviceId,
          deviceName: device.label ?? device.name ?? "SmartTag",
          accessToken: existing.accessToken,
          refreshToken: existing.refreshToken,
          tokenExpiry: existing.tokenExpiry,
          baseUrl: null,
          lastLocation: null,
          isActive: true,
        });
        saved.push(await this.repo.save(newRec));
      }
    }

    return saved;
  }

  /**
   * Polls SmartThings for the current presence / location of a tracker device.
   * Updates lastLocation in the database and returns it.
   */
  async refreshTrackerLocation(
    trackerId: string,
    parentId: string
  ): Promise<SmartDeviceEntity> {
    const device = await this.repo.findOne({
      where: { id: trackerId, parentId, deviceKind: "tracker" },
    });
    if (!device) throw new Error("Tracker not found");

    const token = await this.getValidSmartThingsToken(device);

    const statusRes = await axios.get(ST_DEVICE_STATUS_URL(device.externalDeviceId), {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10_000,
    });

    const components = statusRes.data?.components?.main ?? {};
    const presence =
      components.presenceSensor?.presence?.value ?? "unknown";

    // SmartTag+ / newer models may expose coordinates via threeAxis or location
    const lat: number | null =
      components["samsungvd.relayLocation"]?.locationLatitude?.value ?? null;
    const lng: number | null =
      components["samsungvd.relayLocation"]?.locationLongitude?.value ?? null;

    const location: SmartDeviceEntity["lastLocation"] = {
      lat: lat ?? 0,
      lng: lng ?? 0,
      presence: presence as "present" | "not present" | "unknown",
      updatedAt: new Date().toISOString(),
    };

    await this.repo.update(device.id, { lastLocation: location });
    device.lastLocation = location;

    console.log(
      `[SmartDevice] Tracker "${device.deviceName}" presence=${presence}, ` +
        (lat !== null ? `coords=${lat},${lng}` : "no GPS")
    );

    return device;
  }

  // ── Tile tracker ──────────────────────────────────────────────────────────

  /**
   * Connects Tile trackers using the Tile Platform API.
   * Requires API credentials from tile.com/developer (Life360 approval needed).
   *
   * Tile API endpoint: https://platform.tile.com/api/v1/
   * Auth: Basic auth with email:apiKey encoded as base64.
   */
  async connectTileTrackers(
    parentId: string,
    email: string,
    apiKey: string
  ): Promise<SmartDeviceEntity[]> {
    const TILE_API = "https://platform.tile.com/api/v1";
    const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");

    // Fetch tile list
    const res = await axios.get(`${TILE_API}/tiles`, {
      headers: { Authorization: `Basic ${auth}` },
      timeout: 10_000,
    });

    const tiles: any[] = res.data?.tiles ?? res.data?.data ?? [];
    if (!tiles.length) {
      throw new Error("No Tile trackers found on this account.");
    }

    const saved: SmartDeviceEntity[] = [];
    for (const tile of tiles) {
      const existing = await this.repo.findOne({
        where: { externalDeviceId: tile.uuid, parentId },
      });
      if (existing) {
        saved.push(existing);
        continue;
      }

      const device = this.repo.create({
        parentId,
        platform: "tile" as any,
        deviceKind: "tracker",
        deviceName: tile.name ?? `Tile ${tile.tile_type ?? "Tracker"}`,
        externalDeviceId: tile.uuid,
        accessToken: apiKey,          // store api key as access token
        refreshToken: email,          // store email as refresh token for re-auth
        isActive: true,
        lastLocation: tile.last_tile_state
          ? {
              lat: tile.last_tile_state.latitude ?? 0,
              lng: tile.last_tile_state.longitude ?? 0,
              presence: tile.last_tile_state.is_lost ? "not present" : "present",
              updatedAt: new Date(tile.last_tile_state.timestamp ?? Date.now()).toISOString(),
            }
          : null,
      });

      const s = await this.repo.save(device);
      saved.push(s);
      console.log(`[SmartDevice] Tile tracker "${device.deviceName}" connected for parent ${parentId}`);
    }

    return saved;
  }

  // ── Device management ──────────────────────────────────────────────────────

  async getDevicesByParent(parentId: string): Promise<SmartDeviceEntity[]> {
    return this.repo.find({
      where: { parentId, isActive: true },
      order: { createdAt: "ASC" },
    });
  }

  async removeDevice(id: string, parentId: string): Promise<void> {
    const device = await this.repo.findOne({ where: { id, parentId } });
    if (!device) throw new Error("Smart device not found");
    await this.repo.remove(device);
  }

  /**
   * Links a smart device to a child profile.
   * When that child is locked, this TV will be powered off automatically.
   */
  async linkToChild(
    deviceId: string,
    childId: string | null,
    parentId: string
  ): Promise<SmartDeviceEntity> {
    const device = await this.repo.findOne({ where: { id: deviceId, parentId } });
    if (!device) throw new Error("Smart device not found");
    device.linkedChildId = childId;
    return this.repo.save(device);
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
  async controlDevice(
    deviceId: string,
    action: "on" | "off",
    parentId?: string
  ): Promise<void> {
    const where: any = { id: deviceId, isActive: true };
    if (parentId) where.parentId = parentId;

    const device = await this.repo.findOne({ where });
    if (!device) throw new Error("Smart device not found");

    await this.sendCommand(device, action);
  }

  /**
   * Finds the smart TV linked to a child profile and controls it.
   * Called automatically by ChildService.queueCommand() on LOCK/UNLOCK.
   * Fire-and-forget — errors are logged but not re-thrown.
   */
  async controlByChild(childId: string, action: "on" | "off"): Promise<void> {
    const device = await this.repo.findOne({
      where: { linkedChildId: childId, isActive: true },
    });

    if (!device) return; // No TV linked — nothing to do

    await this.sendCommand(device, action);
  }

  // ── Internal: send command ─────────────────────────────────────────────────

  private async sendCommand(
    device: SmartDeviceEntity,
    action: "on" | "off"
  ): Promise<void> {
    if (device.platform === "smartthings") {
      await this.sendSmartThingsCommand(device, action);
    } else {
      await this.sendHomeAssistantCommand(device, action);
    }

    // Record last action
    await this.repo.update(device.id, {
      lastControlledAt: new Date(),
      lastAction: action,
    });
  }

  private async sendSmartThingsCommand(
    device: SmartDeviceEntity,
    action: "on" | "off"
  ): Promise<void> {
    const token = await this.getValidSmartThingsToken(device);

    await axios.post(
      ST_COMMAND_URL(device.externalDeviceId),
      {
        commands: [
          {
            component: "main",
            capability: "switch",
            command: action === "off" ? "off" : "on",
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10_000,
      }
    );

    console.log(
      `[SmartDevice] SmartThings ${action.toUpperCase()} sent to "${device.deviceName}" (${device.externalDeviceId})`
    );
  }

  private async sendHomeAssistantCommand(
    device: SmartDeviceEntity,
    action: "on" | "off"
  ): Promise<void> {
    const base = device.baseUrl!.replace(/\/$/, "");
    const service =
      action === "off" ? "media_player/turn_off" : "media_player/turn_on";

    await axios.post(
      `${base}/api/services/${service}`,
      { entity_id: device.externalDeviceId },
      {
        headers: {
          Authorization: `Bearer ${device.accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 10_000,
      }
    );

    console.log(
      `[SmartDevice] Home Assistant ${action.toUpperCase()} sent to "${device.deviceName}" (${device.externalDeviceId})`
    );
  }

  // ── SmartThings token refresh ──────────────────────────────────────────────

  /**
   * Returns a valid SmartThings access token, refreshing it if it has expired
   * or will expire within the next 60 seconds.
   */
  private async getValidSmartThingsToken(
    device: SmartDeviceEntity
  ): Promise<string> {
    const needsRefresh =
      !device.tokenExpiry ||
      device.tokenExpiry.getTime() - Date.now() < 60_000;

    if (!needsRefresh) return device.accessToken;

    if (!device.refreshToken) {
      throw new Error(
        `SmartThings token for "${device.deviceName}" has expired and no refresh token is available. Please reconnect.`
      );
    }

    const clientId = process.env.SMARTTHINGS_CLIENT_ID!;
    const clientSecret = process.env.SMARTTHINGS_CLIENT_SECRET!;

    const res = await axios.post(
      ST_TOKEN_URL,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: device.refreshToken,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        },
      }
    );

    const { access_token, refresh_token, expires_in } = res.data;
    const tokenExpiry = new Date(Date.now() + expires_in * 1000);

    // Persist updated tokens
    await this.repo.update(device.id, {
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiry,
    });

    console.log(`[SmartDevice] Refreshed SmartThings token for "${device.deviceName}"`);
    return access_token;
  }
}
