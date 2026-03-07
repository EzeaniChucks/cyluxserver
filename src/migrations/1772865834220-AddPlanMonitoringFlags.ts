import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlanMonitoringFlags1772865834220 implements MigrationInterface {
    name = 'AddPlanMonitoringFlags1772865834220'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "plan_config_entity" ADD "notificationMonitoring" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "plan_config_entity" ADD "callMonitoring" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "plan_config_entity" ADD "smsMonitoring" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "plan_config_entity" DROP COLUMN "smsMonitoring"`);
        await queryRunner.query(`ALTER TABLE "plan_config_entity" DROP COLUMN "callMonitoring"`);
        await queryRunner.query(`ALTER TABLE "plan_config_entity" DROP COLUMN "notificationMonitoring"`);
    }

}
