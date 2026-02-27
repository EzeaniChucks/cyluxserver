import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubscriptionEntity1771792082273 implements MigrationInterface {
    name = 'AddSubscriptionEntity1771792082273'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "subscription_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "parentId" uuid NOT NULL, "plan" character varying NOT NULL DEFAULT 'trial', "status" character varying NOT NULL DEFAULT 'trialing', "trialEndsAt" TIMESTAMP, "currentPeriodEnd" TIMESTAMP, "stripeCustomerId" character varying, "stripeSubscriptionId" character varying, "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_23f0b31fc819b9f55af307e35b" UNIQUE ("parentId"), CONSTRAINT "PK_a98819993766819c043b332748d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "child_entity" ADD "deviceJwt" character varying`);
        await queryRunner.query(`ALTER TABLE "parent_entity" ADD "failedLoginAttempts" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "parent_entity" ADD "lockedUntil" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "pairing_entity" ADD "attemptCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TYPE "public"."audit_log_entity_actiontype_enum" RENAME TO "audit_log_entity_actiontype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."audit_log_entity_actiontype_enum" AS ENUM('APP_OPEN', 'APP_CLOSE', 'APP_BLOCKED', 'WEB_VISIT', 'WEB_BLOCKED', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'GEOFENCE_DWELL', 'LIMIT_REACHED', 'LIMIT_WARNING', 'DEVICE_LOCK', 'DEVICE_UNLOCK', 'HEARTBEAT', 'INVENTORY_SCAN', 'POLICY_SYNC', 'COMMAND_EXECUTED', 'LOCATION_UPDATE', 'BATTERY_UPDATE', 'TAMPER_DETECTED', 'SETTING_CHANGED', 'VPN_STATUS', 'SOS_PANIC')`);
        await queryRunner.query(`ALTER TABLE "audit_log_entity" ALTER COLUMN "actionType" TYPE "public"."audit_log_entity_actiontype_enum" USING "actionType"::"text"::"public"."audit_log_entity_actiontype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."audit_log_entity_actiontype_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."alert_entity_type_enum" RENAME TO "alert_entity_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."alert_entity_type_enum" AS ENUM('geofence_entry', 'geofence_exit', 'geofence_breach', 'limit_reached', 'unsafe_content', 'new_app', 'device_tampered', 'device_offline', 'battery_low', 'policy_violation', 'sos_emergency')`);
        await queryRunner.query(`ALTER TABLE "alert_entity" ALTER COLUMN "type" TYPE "public"."alert_entity_type_enum" USING "type"::"text"::"public"."alert_entity_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."alert_entity_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "subscription_entity" ADD CONSTRAINT "FK_23f0b31fc819b9f55af307e35b1" FOREIGN KEY ("parentId") REFERENCES "parent_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscription_entity" DROP CONSTRAINT "FK_23f0b31fc819b9f55af307e35b1"`);
        await queryRunner.query(`CREATE TYPE "public"."alert_entity_type_enum_old" AS ENUM('geofence_entry', 'geofence_exit', 'geofence_breach', 'limit_reached', 'unsafe_content', 'new_app', 'device_tampered', 'device_offline', 'battery_low', 'policy_violation')`);
        await queryRunner.query(`ALTER TABLE "alert_entity" ALTER COLUMN "type" TYPE "public"."alert_entity_type_enum_old" USING "type"::"text"::"public"."alert_entity_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."alert_entity_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."alert_entity_type_enum_old" RENAME TO "alert_entity_type_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."audit_log_entity_actiontype_enum_old" AS ENUM('APP_OPEN', 'APP_CLOSE', 'APP_BLOCKED', 'WEB_VISIT', 'WEB_BLOCKED', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'GEOFENCE_DWELL', 'LIMIT_REACHED', 'LIMIT_WARNING', 'DEVICE_LOCK', 'DEVICE_UNLOCK', 'HEARTBEAT', 'INVENTORY_SCAN', 'POLICY_SYNC', 'COMMAND_EXECUTED', 'LOCATION_UPDATE', 'BATTERY_UPDATE', 'TAMPER_DETECTED', 'SETTING_CHANGED', 'VPN_STATUS')`);
        await queryRunner.query(`ALTER TABLE "audit_log_entity" ALTER COLUMN "actionType" TYPE "public"."audit_log_entity_actiontype_enum_old" USING "actionType"::"text"::"public"."audit_log_entity_actiontype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."audit_log_entity_actiontype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."audit_log_entity_actiontype_enum_old" RENAME TO "audit_log_entity_actiontype_enum"`);
        await queryRunner.query(`ALTER TABLE "pairing_entity" DROP COLUMN "attemptCount"`);
        await queryRunner.query(`ALTER TABLE "parent_entity" DROP COLUMN "lockedUntil"`);
        await queryRunner.query(`ALTER TABLE "parent_entity" DROP COLUMN "failedLoginAttempts"`);
        await queryRunner.query(`ALTER TABLE "child_entity" DROP COLUMN "deviceJwt"`);
        await queryRunner.query(`DROP TABLE "subscription_entity"`);
    }

}
