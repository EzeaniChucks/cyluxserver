import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { ChildEntity } from "./Child";
import { JSONRecord } from "../types/entities";

@Entity()
export class CommandEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  // Fix: Added Index import from typeorm to resolve missing name error
  @Index()
  childId: string;

  @Column({
    type: "enum",
    enum: [
      "LOCK",
      "UNLOCK",
      "PLAY_SIREN",
      "SYNC_POLICY",
      "WIPE_BROWSER",
      "TAKE_SCREENSHOT",
      "REMOTE_WIPE",
      "REBOOT",
      "INVENTORY_SCAN",
    ],
  })
  type: string;

  @Column("jsonb", { nullable: true })
  payload: JSONRecord | null;

  @Column({ default: "pending" })
  status: "pending" | "delivered" | "executed" | "failed";

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ChildEntity)
  child: ChildEntity;
}
