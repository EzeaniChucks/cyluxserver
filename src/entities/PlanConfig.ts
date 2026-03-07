import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('plan_config_entity')
export class PlanConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Free-form slug, e.g. 'basic', 'premium', 'basic_school'. Immutable after creation. */
  @Column({ unique: true })
  planId: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  /** Monthly price in USD. null for contactSalesOnly plans. */
  @Column('float', { nullable: true })
  price: number | null;

  @Column('int')
  maxDevices: number;

  /** -1 means unlimited (Infinity not storable in Postgres). */
  @Column('int')
  maxGeofences: number;

  @Column({ default: false })
  vpnFiltering: boolean;

  @Column({ default: false })
  realTimeAlerts: boolean;

  /** Read WhatsApp, Instagram, Snapchat etc. notifications. */
  @Column({ default: false })
  notificationMonitoring: boolean;

  /** See every call made and received on the child's device. */
  @Column({ default: false })
  callMonitoring: boolean;

  /** Read SMS/text messages sent and received. */
  @Column({ default: false })
  smsMonitoring: boolean;

  @Column({ default: false })
  smartTv: boolean;

  @Column({ default: false })
  advancedReports: boolean;

  @Column({ default: false })
  schoolDashboard: boolean;

  /** Stripe Price ID for the monthly billing cycle. */
  @Column({ type: 'varchar', nullable: true })
  stripePriceId: string | null;

  /** Stripe Price ID for the annual billing cycle. */
  @Column({ type: 'varchar', nullable: true })
  stripePriceIdAnnual: string | null;

  /** When true, this plan has no self-serve checkout — admin handles billing manually. */
  @Column({ default: false })
  contactSalesOnly: boolean;

  /**
   * Cache of lazily-created Stripe Price IDs for strong local currencies (EUR, GBP, CHF).
   * Key: ISO 4217 currency code (lowercase). Value: Stripe Price ID.
   * e.g. { gbp: 'price_xxx', eur: 'price_yyy' }
   * Populated automatically on first checkout in that currency.
   */
  @Column({ type: 'simple-json', nullable: true })
  localPriceIds: Record<string, string> | null;

  @Column('int', { default: 0 })
  trialDays: number;

  /** False = soft-deleted. Existing subscribers keep access; new signups cannot choose this plan. */
  @Column({ default: true })
  isActive: boolean;

  /** ID of the admin who last updated this config. */
  @Column({ type: 'varchar', nullable: true })
  updatedByAdminId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
