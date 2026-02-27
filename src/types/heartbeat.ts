// cyluxserver/src/types/heartbeat.ts
export interface HeartbeatData {
  battery?: number;
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
    source?: "gps" | "network" | "fused";
  };
  usedMinutes?: number;
  appInventory?: string[];
  currentApp?: string;
  geofenceEvents?: Array<{
    zoneId: string;
    transition: "ENTER" | "EXIT" | "DWELL";
    location: {
      lat: number;
      lng: number;
      accuracy?: number;
    };
    timestamp?: Date;
  }>;
  vpnStatus?: "stopped" | "starting" | "running" | "error";
  blockedDomains?: string[];
  blockedIPs?: string[];
  isRooted?: boolean;
}

export interface HeartbeatResponse {
  policy: {
    status: "active" | "paused" | "offline";
    webFilter: {
      blockedDomains: string[];
      allowedDomains: string[];
      categoryFiltering: boolean;
    };
    dailyLimit: number;
    compliance: "compliant" | "non-compliant" | "tampered";
    blockedApps: string[];
    geofences: Array<{
      id: string;
      name: string;
      lat: number;
      lng: number;
      radius: number;
      type?: "safe" | "restricted" | "notification";
      notifyOn?: ("ENTER" | "EXIT" | "DWELL")[];
      dwellTime?: number;
      enabled?: boolean;
    }>;
    vpnEnabled: boolean;
    vpnBlockedDomains: string[];
  };
  commands: Array<{
    id: string;
    type: string;
    payload: any;
  }>;
  vpnConfig: {
    enabled: boolean;
    blockedDomains: string[];
    blockedIPs: string[];
  };
}
