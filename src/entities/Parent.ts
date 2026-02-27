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

    @OneToMany(() => ChildEntity, child => child.parent)
    children: ChildEntity[];

    @OneToOne(() => SubscriptionEntity, sub => sub.parent, { nullable: true, eager: false })
    subscription: SubscriptionEntity | null;
}