import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from "typeorm";
import { ParentEntity } from "./Parent";
import { AuditLogEntity } from "./AuditLog";
import { AlertEntity } from "./Alert";
import {
  WebFilterConfig,
  GeofenceConfig,
  ScheduleConfig,
  AppUsageRecord,
} from "../types/entities";

@Entity()
export class ChildEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ default: "active" })
  status: "active" | "paused" | "offline";

  @Column({ default: true })
  isEnrolled: boolean;

  @Column({ default: "compliant" })
  complianceStatus: "compliant" | "non-compliant" | "tampered";

  @Column("int", { default: 100 })
  battery: number;

  @Column({ nullable: true })
  fcmToken: string;

  @Column({ type: "varchar", nullable: true })
  deviceType: "ios" | "android" | "android_tv" | "tvos" | null;

  @Column("jsonb", { nullable: true })
  location: { lat: number; lng: number };

  @Column("int", { default: 120 })
  dailyLimitMinutes: number;

  @Column("int", { default: 0 })
  usedMinutes: number;

  @Column("jsonb", {
    default: {
      blockedDomains: [],
      allowedDomains: [],
      categoryFiltering: true,
    },
  })
  webFilter: WebFilterConfig;

  @Column("jsonb", { default: [] })
  blockedApps: string[];

  @Column("jsonb", { default: [] })
  geofences: GeofenceConfig[];

  @Column("jsonb", { nullable: true })
  geofenceStats: {
    lastEntered?: string;
    lastExited?: string;
    currentZone?: string;
    totalEntriesToday?: number;
    totalExitsToday?: number;
    lastEventTime?: Date;
  };

  @Column("jsonb", { default: [] })
  locationHistory: Array<{
    lat: number;
    lng: number;
    timestamp: Date;
  }>;

  @Column("jsonb", { default: [] })
  schedules: ScheduleConfig[];

  @Column("jsonb", { default: [] })
  appUsage: AppUsageRecord[];

  @Column("jsonb", { default: {} })
  usageHistory: Record<string, AppUsageRecord[]>; // Key: YYYY-MM-DD

  @CreateDateColumn()
  @Index()
  lastSeen: Date;

  @Column({ type: "timestamp", nullable: true })
  lastInventoryScan: Date;

  @Column({ type: 'varchar', nullable: true })
  deviceJwt: string | null;

  @ManyToOne(() => ParentEntity, (parent) => parent.children)
  parent: ParentEntity;

  @OneToMany(() => AuditLogEntity, (log) => log.child)
  logs: AuditLogEntity[];

  @OneToMany(() => AlertEntity, (alert) => alert.child)
  alerts: AlertEntity[];
}