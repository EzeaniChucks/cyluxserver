import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSocialContentActionType1773600000000 implements MigrationInterface {
    name = 'AddSocialContentActionType1773600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."audit_log_entity_actiontype_enum" ADD VALUE IF NOT EXISTS 'SOCIAL_CONTENT'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Postgres does not support removing enum values without recreating the type.
        // To roll back: rename old type, create new type without SOCIAL_CONTENT,
        // cast existing rows (which would error if any SOCIAL_CONTENT rows exist),
        // then drop the old type. Leaving as no-op for safety.
    }
}
