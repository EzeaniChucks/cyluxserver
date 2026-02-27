// server/entities/AuditLog.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  // Index,
} from "typeorm";
import { ChildEntity } from "./Child";

@Entity()
// @Index(["childId", "timestamp"]) // ENHANCEMENT: Compound index for common queries
export class AuditLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  // @Index()
  childId: string;

  // ENHANCEMENT: More specific action types for better analytics
  @Column({
    type: "enum",
    enum: [
      "APP_OPEN", // App opened
      "APP_CLOSE", // App closed
      "APP_BLOCKED", // App blocked attempt
      "WEB_VISIT", // Website visited
      "WEB_BLOCKED", // Website blocked
      "GEOFENCE_ENTER", // ENHANCEMENT: Entered geofence
      "GEOFENCE_EXIT", // ENHANCEMENT: Exited geofence
      "GEOFENCE_DWELL", // ENHANCEMENT: Dwelled in geofence
      "LIMIT_REACHED", // Daily limit reached
      "LIMIT_WARNING", // Near limit warning
      "DEVICE_LOCK", // Device locked
      "DEVICE_UNLOCK", // Device unlocked
      "HEARTBEAT", // Periodic heartbeat
      "INVENTORY_SCAN", // App inventory scan
      "POLICY_SYNC", // Policy synced
      "COMMAND_EXECUTED", // MDM command executed
      "LOCATION_UPDATE", // Location updated
      "BATTERY_UPDATE", // Battery level updated
      "TAMPER_DETECTED", // Device tampering detected
      "SETTING_CHANGED", // Setting changed
      "VPN_STATUS", // VPN status
      "SOS_PANIC", // Child-triggered SOS emergency
      "UNLOCK_REQUEST", // Child requesting extra screen time from lock screen
    ],
  })
  actionType: string;

  @Column("text")
  details: string;

  @Column({ default: false })
  // @Index() // ENHANCEMENT: Index for filtering flagged logs
  isFlagged: boolean;

  // ENHANCEMENT: Location as JSON for geofence events
  @Column("jsonb", { nullable: true })
  location: {
    lat: number;
    lng: number;
    accuracy?: number; // Location accuracy in meters
    altitude?: number; // Altitude if available
    speed?: number; // Speed in m/s
    heading?: number; // Direction in degrees
    timestamp?: Date; // When location was recorded
  };

  // ENHANCEMENT: JSON metadata for rich analytics
  @Column("jsonb", { nullable: true })
  metadata: {
    childId?: string;
    zoneId?: string; // For geofence events
    zoneName?: string; // Geofence name
    zoneType?: "safe" | "restricted" | "notification";
    transition?: "ENTER" | "EXIT" | "DWELL";
    dwellTime?: number; // Time spent in zone (seconds)

    location: {
      lat: number;
      lng: number;
      accuracy?: number; // Location accuracy in meters
      altitude?: number; // Altitude if available
      speed?: number; // Speed in m/s
      heading?: number; // Direction in degrees
      timestamp?: Date; // When location was recorded
    };
    // NEW: Add VPN status fields
    vpnStatus?: "stopped" | "starting" | "running" | "error";
    blockedDomains?: string[];
    blockedIPs?: string[];

    appName?: string; // For app events
    appPackage?: string; // Android package name
    appCategory?: string; // App category

    domain?: string; // For web events
    url?: string; // Full URL
    category?: string; // Content category

    batteryLevel?: number; // Device battery
    isCharging?: boolean; // Charging status

    screenOn?: boolean; // Screen state
    wifiConnected?: boolean; // Network status

    commandId?: string; // For command execution
    commandType?: string; // MDM command type
    commandResult?: "success" | "failure";

    duration?: number; // Event duration in seconds
    valueBefore?: any; // Previous value (for changes)
    valueAfter?: any; // New value (for changes)

    triggerSource?: "automatic" | "manual" | "parent"; // How event was triggered
  };

  @CreateDateColumn()
  // @Index() // ENHANCEMENT: Index for time-based queries
  timestamp: Date;

  // ENHANCEMENT: Session ID to group related events
  @Column({ nullable: true })
  sessionId: string;

  // ENHANCEMENT: Version for data migration purposes
  @Column({ default: "1.0" })
  schemaVersion: string;

  @ManyToOne(() => ChildEntity, (child) => child.logs)
  // @Index() // ENHANCEMENT: Index for efficient joins
  child: ChildEntity;
}
