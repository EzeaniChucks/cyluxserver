import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChildTimezone1773076625832 implements MigrationInterface {
    name = 'AddChildTimezone1773076625832'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "child_entity" ADD "timezone" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "child_entity" DROP COLUMN "timezone"`);
    }

}
