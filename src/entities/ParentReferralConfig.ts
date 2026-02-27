import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

export type ParentRewardType = 'trial_extension_days' | 'account_credit_usd' | 'none';

@Entity('parent_referral_config_entity')
export class ParentReferralConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Whether the parent referral program is active */
  @Column({ default: true })
  isEnabled: boolean;

  /** What the referring parent earns per successful conversion */
  @Column({ type: 'varchar', default: 'trial_extension_days' })
  rewardType: ParentRewardType;

  /** Value of the reward: days (for trial extension) or USD amount */
  @Column('float', { default: 7 })
  rewardValue: number;

  /**
   * Optional discount % for the newly referred user's first subscription.
   * 0 = no discount applied.
   */
  @Column('float', { default: 0 })
  referredDiscountPercent: number;

  /** Admin who last updated this config */
  @Column({ type: 'varchar', nullable: true })
  updatedByAdminId: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
