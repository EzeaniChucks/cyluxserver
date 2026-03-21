import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameGeminiKeysToClaude1773500100000 implements MigrationInterface {
    name = 'RenameGeminiKeysToClaude1773500100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "system_config_entity" RENAME COLUMN "geminiApiKey" TO "claudeApiKey"`);
        await queryRunner.query(`ALTER TABLE "system_config_entity" RENAME COLUMN "geminiKeyStatus" TO "claudeKeyStatus"`);
        await queryRunner.query(`ALTER TABLE "system_config_entity" RENAME COLUMN "geminiKeyLastError" TO "claudeKeyLastError"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "system_config_entity" RENAME COLUMN "claudeApiKey" TO "geminiApiKey"`);
        await queryRunner.query(`ALTER TABLE "system_config_entity" RENAME COLUMN "claudeKeyStatus" TO "geminiKeyStatus"`);
        await queryRunner.query(`ALTER TABLE "system_config_entity" RENAME COLUMN "claudeKeyLastError" TO "geminiKeyLastError"`);
    }
}
