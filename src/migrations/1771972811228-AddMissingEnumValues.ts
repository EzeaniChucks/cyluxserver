import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingEnumValues1771972811228 implements MigrationInterface {
    name = 'AddMissingEnumValues1771972811228'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."audit_log_entity_actiontype_enum" RENAME TO "audit_log_entity_actiontype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."audit_log_entity_actiontype_enum" AS ENUM('APP_OPEN', 'APP_CLOSE', 'APP_BLOCKED', 'WEB_VISIT', 'WEB_BLOCKED', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'GEOFENCE_DWELL', 'LIMIT_REACHED', 'LIMIT_WARNING', 'DEVICE_LOCK', 'DEVICE_UNLOCK', 'HEARTBEAT', 'INVENTORY_SCAN', 'POLICY_SYNC', 'COMMAND_EXECUTED', 'LOCATION_UPDATE', 'BATTERY_UPDATE', 'TAMPER_DETECTED', 'SETTING_CHANGED', 'VPN_STATUS', 'SOS_PANIC', 'UNLOCK_REQUEST')`);
        await queryRunner.query(`ALTER TABLE "audit_log_entity" ALTER COLUMN "actionType" TYPE "public"."audit_log_entity_actiontype_enum" USING "actionType"::"text"::"public"."audit_log_entity_actiontype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."audit_log_entity_actiontype_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."alert_entity_type_enum" RENAME TO "alert_entity_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."alert_entity_type_enum" AS ENUM('geofence_entry', 'geofence_exit', 'geofence_breach', 'limit_reached', 'unsafe_content', 'new_app', 'device_tampered', 'device_offline', 'battery_low', 'policy_violation', 'sos_emergency', 'time_request')`);
        await queryRunner.query(`ALTER TABLE "alert_entity" ALTER COLUMN "type" TYPE "public"."alert_entity_type_enum" USING "type"::"text"::"public"."alert_entity_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."alert_entity_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."alert_entity_type_enum_old" AS ENUM('battery_low', 'device_offline', 'device_tampered', 'geofence_breach', 'geofence_entry', 'geofence_exit', 'limit_reached', 'new_app', 'policy_violation', 'sos_emergency', 'unsafe_content')`);
        await queryRunner.query(`ALTER TABLE "alert_entity" ALTER COLUMN "type" TYPE "public"."alert_entity_type_enum_old" USING "type"::"text"::"public"."alert_entity_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."alert_entity_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."alert_entity_type_enum_old" RENAME TO "alert_entity_type_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."audit_log_entity_actiontype_enum_old" AS ENUM('APP_BLOCKED', 'APP_CLOSE', 'APP_OPEN', 'BATTERY_UPDATE', 'COMMAND_EXECUTED', 'DEVICE_LOCK', 'DEVICE_UNLOCK', 'GEOFENCE_DWELL', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'HEARTBEAT', 'INVENTORY_SCAN', 'LIMIT_REACHED', 'LIMIT_WARNING', 'LOCATION_UPDATE', 'POLICY_SYNC', 'SETTING_CHANGED', 'SOS_PANIC', 'TAMPER_DETECTED', 'VPN_STATUS', 'WEB_BLOCKED', 'WEB_VISIT')`);
        await queryRunner.query(`ALTER TABLE "audit_log_entity" ALTER COLUMN "actionType" TYPE "public"."audit_log_entity_actiontype_enum_old" USING "actionType"::"text"::"public"."audit_log_entity_actiontype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."audit_log_entity_actiontype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."audit_log_entity_actiontype_enum_old" RENAME TO "audit_log_entity_actiontype_enum"`);
    }

}
