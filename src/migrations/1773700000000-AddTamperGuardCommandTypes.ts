import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTamperGuardCommandTypes1773700000000 implements MigrationInterface {
    name = 'AddTamperGuardCommandTypes1773700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."command_entity_type_enum" RENAME TO "command_entity_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."command_entity_type_enum" AS ENUM('LOCK', 'UNLOCK', 'PLAY_SIREN', 'SYNC_POLICY', 'WIPE_BROWSER', 'TAKE_SCREENSHOT', 'REMOTE_WIPE', 'REBOOT', 'INVENTORY_SCAN', 'HIDE_ICON', 'SHOW_ICON', 'SET_PARENT_PIN', 'ENABLE_SETTINGS_GUARD', 'DISABLE_SETTINGS_GUARD')`);
        await queryRunner.query(`ALTER TABLE "command_entity" ALTER COLUMN "type" TYPE "public"."command_entity_type_enum" USING "type"::"text"::"public"."command_entity_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."command_entity_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."command_entity_type_enum" RENAME TO "command_entity_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."command_entity_type_enum" AS ENUM('LOCK', 'UNLOCK', 'PLAY_SIREN', 'SYNC_POLICY', 'WIPE_BROWSER', 'TAKE_SCREENSHOT', 'REMOTE_WIPE', 'REBOOT', 'INVENTORY_SCAN')`);
        await queryRunner.query(`ALTER TABLE "command_entity" ALTER COLUMN "type" TYPE "public"."command_entity_type_enum" USING "type"::"text"::"public"."command_entity_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."command_entity_type_enum_old"`);
    }
}
