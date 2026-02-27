import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('payout_config_entity')
export class PayoutConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Minimum USD balance before an influencer can withdraw */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 20 })
  minWithdrawalUsdInfluencer: number;

  /** Minimum USD balance before a parent can withdraw */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 10 })
  minWithdrawalUsdParent: number;

  /** Days earned credits are held before becoming withdrawable (fraud buffer) */
  @Column({ type: 'int', default: 14 })
  holdDays: number;

  @Column({ type: 'varchar', nullable: true })
  updatedByAdminId: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
