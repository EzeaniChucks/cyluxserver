import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

@Entity()
export class PairingEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    @Index()
    code: string;

    @Column()
    parentId: string;

    @Column()
    childName: string;

    @Column({ type: "timestamp" })
    expiresAt: Date;

    @Column({ type: 'int', default: 0 })
    attemptCount: number;

    @CreateDateColumn()
    createdAt: Date;
}