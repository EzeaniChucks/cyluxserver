"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddMissingEnumValues1771972811228 = void 0;
class AddMissingEnumValues1771972811228 {
    constructor() {
        this.name = 'AddMissingEnumValues1771972811228';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TYPE "public"."audit_log_entity_actiontype_enum" RENAME TO "audit_log_entity_actiontype_enum_old"`);
            yield queryRunner.query(`CREATE TYPE "public"."audit_log_entity_actiontype_enum" AS ENUM('APP_OPEN', 'APP_CLOSE', 'APP_BLOCKED', 'WEB_VISIT', 'WEB_BLOCKED', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'GEOFENCE_DWELL', 'LIMIT_REACHED', 'LIMIT_WARNING', 'DEVICE_LOCK', 'DEVICE_UNLOCK', 'HEARTBEAT', 'INVENTORY_SCAN', 'POLICY_SYNC', 'COMMAND_EXECUTED', 'LOCATION_UPDATE', 'BATTERY_UPDATE', 'TAMPER_DETECTED', 'SETTING_CHANGED', 'VPN_STATUS', 'SOS_PANIC', 'UNLOCK_REQUEST')`);
            yield queryRunner.query(`ALTER TABLE "audit_log_entity" ALTER COLUMN "actionType" TYPE "public"."audit_log_entity_actiontype_enum" USING "actionType"::"text"::"public"."audit_log_entity_actiontype_enum"`);
            yield queryRunner.query(`DROP TYPE "public"."audit_log_entity_actiontype_enum_old"`);
            yield queryRunner.query(`ALTER TYPE "public"."alert_entity_type_enum" RENAME TO "alert_entity_type_enum_old"`);
            yield queryRunner.query(`CREATE TYPE "public"."alert_entity_type_enum" AS ENUM('geofence_entry', 'geofence_exit', 'geofence_breach', 'limit_reached', 'unsafe_content', 'new_app', 'device_tampered', 'device_offline', 'battery_low', 'policy_violation', 'sos_emergency', 'time_request')`);
            yield queryRunner.query(`ALTER TABLE "alert_entity" ALTER COLUMN "type" TYPE "public"."alert_entity_type_enum" USING "type"::"text"::"public"."alert_entity_type_enum"`);
            yield queryRunner.query(`DROP TYPE "public"."alert_entity_type_enum_old"`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`CREATE TYPE "public"."alert_entity_type_enum_old" AS ENUM('battery_low', 'device_offline', 'device_tampered', 'geofence_breach', 'geofence_entry', 'geofence_exit', 'limit_reached', 'new_app', 'policy_violation', 'sos_emergency', 'unsafe_content')`);
            yield queryRunner.query(`ALTER TABLE "alert_entity" ALTER COLUMN "type" TYPE "public"."alert_entity_type_enum_old" USING "type"::"text"::"public"."alert_entity_type_enum_old"`);
            yield queryRunner.query(`DROP TYPE "public"."alert_entity_type_enum"`);
            yield queryRunner.query(`ALTER TYPE "public"."alert_entity_type_enum_old" RENAME TO "alert_entity_type_enum"`);
            yield queryRunner.query(`CREATE TYPE "public"."audit_log_entity_actiontype_enum_old" AS ENUM('APP_BLOCKED', 'APP_CLOSE', 'APP_OPEN', 'BATTERY_UPDATE', 'COMMAND_EXECUTED', 'DEVICE_LOCK', 'DEVICE_UNLOCK', 'GEOFENCE_DWELL', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'HEARTBEAT', 'INVENTORY_SCAN', 'LIMIT_REACHED', 'LIMIT_WARNING', 'LOCATION_UPDATE', 'POLICY_SYNC', 'SETTING_CHANGED', 'SOS_PANIC', 'TAMPER_DETECTED', 'VPN_STATUS', 'WEB_BLOCKED', 'WEB_VISIT')`);
            yield queryRunner.query(`ALTER TABLE "audit_log_entity" ALTER COLUMN "actionType" TYPE "public"."audit_log_entity_actiontype_enum_old" USING "actionType"::"text"::"public"."audit_log_entity_actiontype_enum_old"`);
            yield queryRunner.query(`DROP TYPE "public"."audit_log_entity_actiontype_enum"`);
            yield queryRunner.query(`ALTER TYPE "public"."audit_log_entity_actiontype_enum_old" RENAME TO "audit_log_entity_actiontype_enum"`);
        });
    }
}
exports.AddMissingEnumValues1771972811228 = AddMissingEnumValues1771972811228;
//# sourceMappingURL=1771972811228-AddMissingEnumValues.js.map