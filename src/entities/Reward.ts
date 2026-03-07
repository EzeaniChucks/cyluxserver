// server/entities/Reward.ts — bonus screen-time rewards granted by parent
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity()
@Index(["childId", "claimed"])
export class RewardEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  parentId: string;

  @Column()
  @Index()
  childId: string;

  @Column("int")
  minutes: number;

  @Column({ nullable: true })
  reason: string;

  @Column({ default: false })
  claimed: boolean;

  @Column({ type: "timestamp", nullable: true })
  claimedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
