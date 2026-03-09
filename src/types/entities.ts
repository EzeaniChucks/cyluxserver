export interface WebFilterConfig {
  blockedDomains: string[];
  allowedDomains: string[];
  categoryFiltering: boolean;
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


export interface GeofenceTimeWindow {
  days: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[];
  startTime: string; // "HH:MM" local time — when zone becomes active
  endTime: string;   // "HH:MM" local time — when zone becomes inactive
}

export interface GeofenceConfig {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  type: 'safe' | 'restricted' | 'notification';
  notifyOn: ('ENTER' | 'EXIT' | 'DWELL')[];
  dwellTime?: number;  // Minimum seconds for dwell trigger (default 60)
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;

  // ── Timed geofencing fields (all optional, backwards-compatible) ──────────
  /** Active time windows; empty/absent means 24/7 */
  timeWindows?: GeofenceTimeWindow[];
  /** "HH:MM" — fire GEOFENCE_OVERDUE if child is still INSIDE after this time */
  alertOnMissedDeparture?: string | null;
  /** Days (Mon–Sun) to check missed departure; absent means every day */
  missedDepartureDays?: string[];
  /** "HH:MM" — fire GEOFENCE_MISSING if child is NOT INSIDE by this time */
  alertOnMissedArrival?: string | null;
  /** Days (Mon–Sun) to check missed arrival; absent means every day */
  missedArrivalDays?: string[];
  /** ISO timestamp of last GEOFENCE_OVERDUE alert (deduplication — once per day) */
  lastMissedDepartureAlert?: string | null;
  /** ISO timestamp of last GEOFENCE_MISSING alert (deduplication — once per day) */
  lastMissedArrivalAlert?: string | null;
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