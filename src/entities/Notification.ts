import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";
import { JSONRecord } from "../types/entities";

@Entity()
export class NotificationEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  @Index()
  recipientId: string;

  @Column({
    type: "enum",
    enum: ["parent", "child"],
  })
  recipientType: "parent" | "child";

  @Column()
  title: string;

  @Column("text")
  body: string;

  @Column({ default: false })
  isRead: boolean;

  @Column("jsonb", { nullable: true })
  data: JSONRecord | null;

  @CreateDateColumn()
  createdAt: Date;
}
