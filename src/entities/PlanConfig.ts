import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PlanId } from '../config/plans';

@Entity('plan_config_entity')
export class PlanConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  planId: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('float', { nullable: true })
  price: number | null;

  @Column('int')
  maxDevices: number;

  /** -1 means unlimited (replaces Infinity for DB storage) */
  @Column('int')
  maxGeofences: number;

  @Column({ default: false })
  vpnFiltering: boolean;

  @Column({ default: false })
  realTimeAlerts: boolean;

  @Column({ default: false })
  smartTv: boolean;

  @Column({ default: false })
  advancedReports: boolean;

  @Column({ default: false })
  schoolDashboard: boolean;

  @Column({ type: 'varchar', nullable: true })
  stripePriceId: string | null;

  @Column('int', { default: 0 })
  trialDays: number;

  @Column({ default: true })
  isActive: boolean;

  /** ID of the admin who last updated this config */
  @Column({ type: 'varchar', nullable: true })
  updatedByAdminId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
