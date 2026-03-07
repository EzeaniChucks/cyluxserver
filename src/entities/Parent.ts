import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne } from "typeorm";
import { ChildEntity } from "./Child";
import { SubscriptionEntity } from "./Subscription";

@Entity()
export class ParentEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    passwordHash: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    fcmToken: string;

    @Column({ type: "enum", enum: ["ios", "android"], nullable: true })
    deviceType: 'ios' | 'android';

    @Column({ nullable: true })
    resetPasswordToken: string;

    @Column({ type: "timestamp", nullable: true })
    resetPasswordExpires: Date;

    @Column({ type: 'int', default: 0 })
    failedLoginAttempts: number;

    @Column({ type: 'timestamp', nullable: true })
    lockedUntil: Date | null;

    /** Referral code from an influencer — stored at registration */
    @Column({ type: 'varchar', nullable: true })
    referralCode: string | null;

    /** This parent's own referral code to share with friends */
    @Column({ type: 'varchar', nullable: true, unique: true })
    ownReferralCode: string | null;

    /** ISO 3166-1 alpha-2 country detected at registration, e.g. 'NG' */
    @Column({ type: 'varchar', length: 2, nullable: true })
    country: string | null;

    /** ISO 4217 lowercase currency for Stripe billing — locked at subscription creation */
    @Column({ type: 'varchar', length: 10, default: 'usd' })
    currency: string;

    /** BCP-47 locale, e.g. 'en-NG' */
    @Column({ type: 'varchar', nullable: true })
    locale: string | null;

    /** True if a VPN/proxy/Tor exit node was detected at registration */
    @Column({ type: 'boolean', default: false })
    vpnFlagged: boolean;

    /** Which signals determined the country: 'ip', 'sim+ip', 'ip+timezone', etc. */
    @Column({ type: 'varchar', nullable: true })
    detectedVia: string | null;

    @OneToMany(() => ChildEntity, child => child.parent)
    children: ChildEntity[];

    @OneToOne(() => SubscriptionEntity, sub => sub.parent, { nullable: true, eager: false })
    subscription: SubscriptionEntity | null;
}