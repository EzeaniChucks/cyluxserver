import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ParentEntity } from './Parent';

export type ParentReferralStatus = 'registered' | 'subscribed' | 'reward_granted';

@Entity('parent_referral_entity')
export class ParentReferralEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The existing parent who shared their referral code */
  @Column()
  referrerId: string;

  @ManyToOne(() => ParentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrerId' })
  referrer: ParentEntity;

  /** The new parent who signed up using the referral code */
  @Column()
  referredId: string;

  @ManyToOne(() => ParentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referredId' })
  referred: ParentEntity;

  @Column({ type: 'varchar', default: 'registered' })
  status: ParentReferralStatus;

  /** Plan the referred user subscribed to */
  @Column({ type: 'varchar', nullable: true })
  plan: string | null;

  /** Amount paid on first invoice (cents) */
  @Column('int', { nullable: true })
  firstPaymentAmountCents: number | null;

  /** Reward granted to referrer */
  @Column('float', { nullable: true })
  rewardValue: number | null;

  @Column({ type: 'varchar', nullable: true })
  rewardType: string | null;

  @Column({ type: 'timestamp', nullable: true })
  rewardGrantedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
