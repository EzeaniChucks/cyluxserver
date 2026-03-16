import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSystemConfig1773416740330 implements MigrationInterface {
    name = 'AddSystemConfig1773416740330'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "system_config_entity" ("id" character varying(20) NOT NULL, "geminiApiKey" character varying, "geminiKeyStatus" character varying NOT NULL DEFAULT 'unconfigured', "geminiKeyLastError" text, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_63dc73cbb607fede4fbe94b24b6" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "system_config_entity"`);
    }

}
