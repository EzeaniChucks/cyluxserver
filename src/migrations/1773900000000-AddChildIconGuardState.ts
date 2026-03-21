import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChildIconGuardState1773900000000 implements MigrationInterface {
    name = 'AddChildIconGuardState1773900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "child_entity" ADD COLUMN IF NOT EXISTS "iconHidden" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "child_entity" ADD COLUMN IF NOT EXISTS "settingsGuardEnabled" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "child_entity" DROP COLUMN IF EXISTS "settingsGuardEnabled"`);
        await queryRunner.query(`ALTER TABLE "child_entity" DROP COLUMN IF EXISTS "iconHidden"`);
    }
}
