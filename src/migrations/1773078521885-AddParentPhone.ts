import { MigrationInterface, QueryRunner } from "typeorm";

export class AddParentPhone1773078521885 implements MigrationInterface {
    name = 'AddParentPhone1773078521885'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "parent_entity" ADD "phone" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "parent_entity" DROP COLUMN "phone"`);
    }

}
