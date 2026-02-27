import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InfluencerEntity } from './Influencer';
import { ParentEntity } from './Parent';

export type ReferralStatus = 'registered' | 'subscribed' | 'reward_pending' | 'reward_paid';

@Entity('referral_entity')
export class ReferralEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  influencerId: string;

  @ManyToOne(() => InfluencerEntity, i => i.referrals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'influencerId' })
  influencer: InfluencerEntity;

  @Column()
  referredParentId: string;

  @ManyToOne(() => ParentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referredParentId' })
  referredParent: ParentEntity;

  @Column({ type: 'varchar', default: 'registered' })
  status: ReferralStatus;

  @Column('float', { default: 0 })
  discountPercent: number;

  /** Amount the referred user paid on their first invoice (cents) */
  @Column('int', { nullable: true })
  firstPaymentAmountCents: number | null;

  /** Calculated reward for the influencer */
  @Column('float', { nullable: true })
  rewardAmount: number | null;

  @Column({ type: 'varchar', nullable: true })
  rewardType: string | null;

  @Column({ type: 'timestamp', nullable: true })
  rewardPaidAt: Date | null;

  /** Plan the referred user subscribed to */
  @Column({ type: 'varchar', nullable: true })
  plan: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
