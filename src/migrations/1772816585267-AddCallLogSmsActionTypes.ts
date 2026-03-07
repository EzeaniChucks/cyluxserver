import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCallLogSmsActionTypes1772816585267 implements MigrationInterface {
    name = 'AddCallLogSmsActionTypes1772816585267'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."audit_log_entity_actiontype_enum" RENAME TO "audit_log_entity_actiontype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."audit_log_entity_actiontype_enum" AS ENUM('APP_OPEN', 'APP_CLOSE', 'APP_BLOCKED', 'WEB_VISIT', 'WEB_BLOCKED', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'GEOFENCE_DWELL', 'LIMIT_REACHED', 'LIMIT_WARNING', 'DEVICE_LOCK', 'DEVICE_UNLOCK', 'HEARTBEAT', 'INVENTORY_SCAN', 'POLICY_SYNC', 'COMMAND_EXECUTED', 'LOCATION_UPDATE', 'BATTERY_UPDATE', 'TAMPER_DETECTED', 'SETTING_CHANGED', 'VPN_STATUS', 'SOS_PANIC', 'UNLOCK_REQUEST', 'YOUTUBE_WATCH', 'YOUTUBE_SEARCH', 'NOTIFICATION_RECEIVED', 'CALL_LOG', 'SMS_RECEIVED')`);
        await queryRunner.query(`ALTER TABLE "audit_log_entity" ALTER COLUMN "actionType" TYPE "public"."audit_log_entity_actiontype_enum" USING "actionType"::"text"::"public"."audit_log_entity_actiontype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."audit_log_entity_actiontype_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."audit_log_entity_actiontype_enum_old" AS ENUM('APP_OPEN', 'APP_CLOSE', 'APP_BLOCKED', 'WEB_VISIT', 'WEB_BLOCKED', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'GEOFENCE_DWELL', 'LIMIT_REACHED', 'LIMIT_WARNING', 'DEVICE_LOCK', 'DEVICE_UNLOCK', 'HEARTBEAT', 'INVENTORY_SCAN', 'POLICY_SYNC', 'COMMAND_EXECUTED', 'LOCATION_UPDATE', 'BATTERY_UPDATE', 'TAMPER_DETECTED', 'SETTING_CHANGED', 'VPN_STATUS', 'SOS_PANIC', 'UNLOCK_REQUEST', 'YOUTUBE_WATCH', 'YOUTUBE_SEARCH', 'NOTIFICATION_RECEIVED')`);
        await queryRunner.query(`ALTER TABLE "audit_log_entity" ALTER COLUMN "actionType" TYPE "public"."audit_log_entity_actiontype_enum_old" USING "actionType"::"text"::"public"."audit_log_entity_actiontype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."audit_log_entity_actiontype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."audit_log_entity_actiontype_enum_old" RENAME TO "audit_log_entity_actiontype_enum"`);
    }

}
