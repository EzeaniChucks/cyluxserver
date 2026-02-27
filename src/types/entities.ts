export interface WebFilterConfig {
  blockedDomains: string[];
  allowedDomains: string[];
  categoryFiltering: boolean;
}

export interface GeofenceConfig {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

export interface AppUsageRecord {
  name: string;
  packageName:string;
  timeSpentMinutes: number;
  limitMinutes: number;
  category: "Social" | "Games" | "Education" | "Entertainment" | string;
}

export interface ScheduleConfig {
  day:
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday"
    | "Everyday";
  startTime: string; // Expected "HH:mm"
  endTime: string; // Expected "HH:mm"
  active: boolean;
}

export type JSONRecord = Record<
  string,
  string | number | boolean | object | null
>;


// server/types/entities.ts (additions)
export interface GeofenceConfig {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  type: 'safe' | 'restricted' | 'notification';
  notifyOn: ('ENTER' | 'EXIT' | 'DWELL')[];
  dwellTime?: number; // Minimum seconds for dwell trigger
  color?: string;     // UI color override
  priority?: number;  // 1-10, higher = more important
  enabled: boolean;   // Toggle on/off
  createdAt: Date;
  updatedAt: Date;
}

// ENHANCEMENT: New interface for geofence events
export interface GeofenceEvent {
  zoneId: string;
  zoneName: string;
  transition: 'ENTER' | 'EXIT' | 'DWELL';
  timestamp: Date;
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  dwellTime?: number; // For DWELL events
}

// ENHANCEMENT: Analytics interfaces
export interface GeofenceAnalytics {
  zoneId: string;
  zoneName: string;
  entries: number;
  exits: number;
  totalDwellTime: number; // in seconds
  averageDwellTime: number;
  lastEntry: Date | null;
  lastExit: Date | null;
  complianceRate: number; // % of time in allowed zones
}

export interface AlertAnalytics {
  type: string;
  count: number;
  resolved: number;
  avgResolutionTime: number; // in hours
  bySeverity: {
    critical: number;
    high: number;
    warning: number;
    info: number;
  };
}