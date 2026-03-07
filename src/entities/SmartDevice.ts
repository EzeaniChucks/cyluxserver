import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { ParentEntity } from "./Parent";

/**
 * SmartDeviceEntity — stores a parent's connected smart device (TV or tracker).
 *
 * deviceKind:
 *  "tv"       Power-controllable TV (SmartThings or Home Assistant)
 *  "tracker"  Location tracker (Samsung SmartTag via SmartThings)
 *
 * Supported platforms:
 *  "smartthings"    Samsung devices via the SmartThings cloud API (TVs + SmartTags)
 *  "home_assistant" LG, Philips, Vizio, etc. via a local Home Assistant instance
 */
@Entity("smart_devices")
export class SmartDeviceEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // ── Owner ──────────────────────────────────────────────────────────────────

  @Index()
  @Column()
  parentId: string;

  @ManyToOne(() => ParentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "parentId" })
  parent: ParentEntity;

  // ── Kind + Platform ────────────────────────────────────────────────────────

  /** "tv" = power-controllable TV, "tracker" = location tracker (SmartTag) */
  @Column({ type: "varchar", default: "tv" })
  deviceKind: "tv" | "tracker";

  @Column({ type: "varchar" })
  platform: "smartthings" | "home_assistant";

  // ── Device identity ────────────────────────────────────────────────────────

  /** SmartThings deviceId (UUID) or Home Assistant entity_id (e.g. "media_player.living_room_tv") */
  @Column()
  externalDeviceId: string;

  @Column()
  deviceName: string;

  // ── Credentials ────────────────────────────────────────────────────────────

  /**
   * SmartThings: OAuth access token.
   * Home Assistant: long-lived access token (never expires).
   */
  @Column({ type: "text" })
  accessToken: string;

  /** SmartThings only — used to obtain a fresh access token when it expires. */
  @Column({ type: "text", nullable: true })
  refreshToken: string | null;

  /** UTC timestamp when the SmartThings access token expires. Null for HA. */
  @Column({ type: "timestamptz", nullable: true })
  tokenExpiry: Date | null;

  /**
   * Home Assistant base URL, e.g. "http://192.168.1.50:8123" or
   * "https://ha.yourdomain.com".  Null for SmartThings (uses cloud API).
   */
  @Column({ type: "varchar", nullable: true })
  baseUrl: string | null;

  // ── Linking ────────────────────────────────────────────────────────────────

  /**
   * The child profile this TV is associated with.
   * When this child is locked, this TV will be powered off.
   */
  @Index()
  @Column({ type: "varchar", nullable: true })
  linkedChildId: string | null;

  // ── Tracker location (SmartTag only) ──────────────────────────────────────

  /**
   * Last known location from SmartThings for tracker devices.
   * Null for TVs. Updated when parent refreshes or on scheduled poll.
   */
  @Column({ type: "jsonb", nullable: true })
  lastLocation: {
    lat: number;
    lng: number;
    presence: "present" | "not present" | "unknown";
    updatedAt: string;
  } | null;

  // ── State ──────────────────────────────────────────────────────────────────

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "timestamptz", nullable: true })
  lastControlledAt: Date | null;

  /** Last control action performed: "on" | "off" */
  @Column({ type: "varchar", nullable: true })
  lastAction: string | null;

  // ── Timestamps ─────────────────────────────────────────────────────────────

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
