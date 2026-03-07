import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSmartDeviceKindAndTracker1772765661302 implements MigrationInterface {
    name = 'AddSmartDeviceKindAndTracker1772765661302'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "smart_devices" ADD "deviceKind" character varying NOT NULL DEFAULT 'tv'`);
        await queryRunner.query(`ALTER TABLE "smart_devices" ADD "lastLocation" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "smart_devices" DROP COLUMN "lastLocation"`);
        await queryRunner.query(`ALTER TABLE "smart_devices" DROP COLUMN "deviceKind"`);
    }

}
