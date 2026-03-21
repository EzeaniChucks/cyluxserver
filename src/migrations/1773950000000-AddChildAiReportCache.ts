import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChildAiReportCache1773950000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "child_entity" ADD COLUMN IF NOT EXISTS "aiReport" jsonb DEFAULT NULL`);
    await queryRunner.query(`ALTER TABLE "child_entity" ADD COLUMN IF NOT EXISTS "aiReportDate" varchar DEFAULT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "child_entity" DROP COLUMN IF EXISTS "aiReportDate"`);
    await queryRunner.query(`ALTER TABLE "child_entity" DROP COLUMN IF EXISTS "aiReport"`);
  }
}
