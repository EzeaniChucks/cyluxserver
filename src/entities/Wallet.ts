import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type WalletOwnerType = 'parent' | 'influencer';

@Entity('wallet_entity')
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** ID of the owning parent or influencer */
  @Column({ type: 'varchar' })
  ownerId: string;

  @Column({ type: 'varchar' })
  ownerType: WalletOwnerType;

  /** Available balance — ready to withdraw or apply as billing credit */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balanceUsd: number;

  /** Earnings in the hold period (not yet withdrawable) */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  pendingUsd: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  lifetimeEarnedUsd: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalWithdrawnUsd: number;

  /** Stripe Connect Express account ID — set when user connects their bank */
  @Column({ type: 'varchar', nullable: true })
  stripeConnectAccountId: string | null;

  /** True once Stripe confirms the account has passed KYC and is payable */
  @Column({ type: 'boolean', default: false })
  stripeConnectOnboarded: boolean;

  @Column({ type: 'varchar', nullable: true })
  country: string | null;

  @Column({ type: 'varchar', default: 'USD' })
  currency: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
