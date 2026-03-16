import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
} from "typeorm";
import { ParentEntity } from "./Parent";

/**
 * NetworkProfileEntity — stores a parent's home-network DNS filtering config.
 * Integrates with NextDNS to push blocked domains from all child policies onto
 * the family's NextDNS profile, so any device on the home network (Roku, smart
 * TVs, consoles, etc.) is subject to the same content filtering.
 */
@Entity("network_profile_entity")
export class NetworkProfileEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => ParentEntity, { onDelete: "CASCADE" })
  @JoinColumn()
  parent: ParentEntity;

  @Column({ type: "uuid" })
  parentId: string;

  /** NextDNS API key — stored encrypted at rest; display masked in API responses */
  @Column({ type: "varchar", nullable: true })
  nextdnsApiKey: string | null;

  /** NextDNS profile ID (6-char alphanumeric, e.g. "a1b2c3") */
  @Column({ type: "varchar", nullable: true })
  nextdnsProfileId: string | null;

  /** NextDNS profile name as returned by the API */
  @Column({ type: "varchar", nullable: true })
  nextdnsProfileName: string | null;

  /** Auto-sync child blocked domains to NextDNS whenever heartbeat updates policy */
  @Column({ type: "boolean", default: true })
  autoSync: boolean;

  /** Whether router/DNS filtering is enabled */
  @Column({ type: "boolean", default: false })
  enabled: boolean;

  /** Additional domains to block beyond what children's policies dictate */
  @Column({ type: "simple-array", nullable: true })
  extraBlockedDomains: string[] | null;

  /** ISO timestamp of last successful NextDNS sync */
  @Column({ type: "timestamp", nullable: true })
  lastSyncAt: Date | null;

  /** Number of domains synced in the last successful sync */
  @Column({ type: "int", default: 0 })
  lastSyncCount: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
