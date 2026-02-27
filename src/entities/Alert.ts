// server/entities/Alert.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { ChildEntity } from "./Child";

@Entity()
export class AlertEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  // @Index() // ENHANCEMENT: Index for faster queries by child
  childId: string;

  // ENHANCEMENT: Expanded alert types with specific geofence alerts
  @Column({
    type: "enum",
    enum: [
      "geofence_entry",      // ENHANCEMENT: Specific entry alert
      "geofence_exit",       // ENHANCEMENT: Specific exit alert
      "geofence_breach",     // ENHANCEMENT: Restricted zone violation
      "limit_reached",       // Screen time limit reached
      "unsafe_content",      // Blocked web content
      "new_app",             // New app detected
      "device_tampered",     // Root/jailbreak detected
      "device_offline",      // No heartbeat
      "battery_low",         // Low battery warning
      "policy_violation",    // General policy violation
      "sos_emergency",       // SOS panic button triggered
      "time_request"         // Child requested extra screen time
    ],
  })
  type: string;

  @Column("text")
  message: string;

  @CreateDateColumn()
  // @Index() // ENHANCEMENT: Index for ordering by date
  timestamp: Date;

  // ENHANCEMENT: More specific severity levels
  @Column({
    type: "enum",
    enum: ["info", "warning", "high", "critical"],
    default: "warning",
  })
  severity: string;

  // ENHANCEMENT: Store resolved status
  @Column({ default: false })
  isResolved: boolean;

  @Column({ type: "timestamp", nullable: true })
  resolvedAt: Date;

  // ENHANCEMENT: JSON metadata for additional context
  @Column("json", { nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => ChildEntity, (child) => child.alerts)
  // @Index() // ENHANCEMENT: Index for joins
  child: ChildEntity;
}