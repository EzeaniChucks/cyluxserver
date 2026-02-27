import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ReferralEntity } from './Referral';

export type RewardType = 'percentage' | 'fixed' | 'credit' | null;

@Entity('influencer_entity')
export class InfluencerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  /** Short referral code — unique, URL-safe */
  @Column({ unique: true })
  code: string;

  /** Discount percent applied to referred user's first subscription */
  @Column('float', { default: 20 })
  discountPercent: number;

  /** Stripe coupon ID lazily created when the code is first used at checkout */
  @Column({ type: 'varchar', nullable: true })
  stripeCouponId: string | null;

  @Column({ type: 'varchar', nullable: true })
  rewardType: RewardType;

  /** Value of the reward: percentage or fixed USD amount */
  @Column('float', { nullable: true })
  rewardValue: number | null;

  @Column('int', { default: 0 })
  totalReferrals: number;

  @Column('int', { default: 0 })
  totalConversions: number;

  @Column('float', { default: 0 })
  totalEarningsUsd: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => ReferralEntity, r => r.influencer)
  referrals: ReferralEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
