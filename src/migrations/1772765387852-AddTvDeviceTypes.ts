import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTvDeviceTypes1772765387852 implements MigrationInterface {
    name = 'AddTvDeviceTypes1772765387852'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "child_entity" DROP COLUMN "deviceType"`);
        await queryRunner.query(`DROP TYPE "public"."child_entity_devicetype_enum"`);
        await queryRunner.query(`ALTER TABLE "child_entity" ADD "deviceType" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "child_entity" DROP COLUMN "deviceType"`);
        await queryRunner.query(`CREATE TYPE "public"."child_entity_devicetype_enum" AS ENUM('ios', 'android')`);
        await queryRunner.query(`ALTER TABLE "child_entity" ADD "deviceType" "public"."child_entity_devicetype_enum"`);
    }

}
