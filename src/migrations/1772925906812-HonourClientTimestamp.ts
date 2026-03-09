import { MigrationInterface, QueryRunner } from "typeorm";

export class HonourClientTimestamp1772925906812 implements MigrationInterface {
    name = 'HonourClientTimestamp1772925906812'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_log_entity" DROP COLUMN "timestamp"`);
        await queryRunner.query(`ALTER TABLE "audit_log_entity" ADD "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_log_entity" DROP COLUMN "timestamp"`);
        await queryRunner.query(`ALTER TABLE "audit_log_entity" ADD "timestamp" TIMESTAMP NOT NULL DEFAULT now()`);
    }

}
