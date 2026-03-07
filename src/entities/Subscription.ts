import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ParentEntity } from './Parent';

@Entity('subscription_entity')
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  parentId: string;

  @OneToOne(() => ParentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent: ParentEntity;

  /** Plan slug — matches planId in plan_config_entity. 'trial' is server-managed. */
  @Column({ type: 'varchar', default: 'trial' })
  plan: string;

  /** Stripe/internal status: trialing | active | past_due | cancelled | incomplete */
  @Column({ type: 'varchar', default: 'trialing' })
  status: string;

  /** 'monthly' or 'annual' — determined at checkout from the Stripe Price ID used. */
  @Column({ type: 'varchar', default: 'monthly' })
  billingInterval: 'monthly' | 'annual';

  /** When the 7-day server-managed trial expires (null for paid plans). */
  @Column({ type: 'timestamp', nullable: true })
  trialEndsAt: Date | null;

  /** Current Stripe billing period end (null while trialing or cancelled). */
  @Column({ type: 'timestamp', nullable: true })
  currentPeriodEnd: Date | null;

  @Column({ type: 'varchar', nullable: true })
  stripeCustomerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  stripeSubscriptionId: string | null;

  /** True when Stripe will not renew at period end (user requested cancel). */
  @Column({ default: false })
  cancelAtPeriodEnd: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
