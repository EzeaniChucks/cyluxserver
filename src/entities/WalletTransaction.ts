import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type TxType = 'credit' | 'withdrawal' | 'billing_credit' | 'clawback';
export type TxStatus = 'pending' | 'available' | 'paid_out' | 'applied' | 'clawed_back';

@Entity('wallet_transaction_entity')
export class WalletTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  walletId: string;

  /** credit = earnings added; withdrawal = bank payout; billing_credit = applied to subscription; clawback = reversed */
  @Column({ type: 'varchar' })
  type: TxType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amountUsd: number;

  @Column({ type: 'varchar' })
  description: string;

  /** The referral/conversion ID that triggered this credit, for audit */
  @Column({ type: 'varchar', nullable: true })
  referenceId: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  status: TxStatus;

  /** Timestamp when hold expires and this credit becomes withdrawable */
  @Column({ type: 'timestamptz', nullable: true })
  availableAt: Date | null;

  /** Stripe transfer ID for withdrawal transactions */
  @Column({ type: 'varchar', nullable: true })
  stripeTransferId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
