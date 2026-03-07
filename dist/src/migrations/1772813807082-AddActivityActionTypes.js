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
exports.AddActivityActionTypes1772813807082 = void 0;
class AddActivityActionTypes1772813807082 {
    constructor() {
        this.name = 'AddActivityActionTypes1772813807082';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "plan_config_entity" ADD "localPriceIds" text`);
            yield queryRunner.query(`ALTER TYPE "public"."audit_log_entity_actiontype_enum" RENAME TO "audit_log_entity_actiontype_enum_old"`);
            yield queryRunner.query(`CREATE TYPE "public"."audit_log_entity_actiontype_enum" AS ENUM('APP_OPEN', 'APP_CLOSE', 'APP_BLOCKED', 'WEB_VISIT', 'WEB_BLOCKED', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'GEOFENCE_DWELL', 'LIMIT_REACHED', 'LIMIT_WARNING', 'DEVICE_LOCK', 'DEVICE_UNLOCK', 'HEARTBEAT', 'INVENTORY_SCAN', 'POLICY_SYNC', 'COMMAND_EXECUTED', 'LOCATION_UPDATE', 'BATTERY_UPDATE', 'TAMPER_DETECTED', 'SETTING_CHANGED', 'VPN_STATUS', 'SOS_PANIC', 'UNLOCK_REQUEST', 'YOUTUBE_WATCH', 'YOUTUBE_SEARCH', 'NOTIFICATION_RECEIVED')`);
            yield queryRunner.query(`ALTER TABLE "audit_log_entity" ALTER COLUMN "actionType" TYPE "public"."audit_log_entity_actiontype_enum" USING "actionType"::"text"::"public"."audit_log_entity_actiontype_enum"`);
            yield queryRunner.query(`DROP TYPE "public"."audit_log_entity_actiontype_enum_old"`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`CREATE TYPE "public"."audit_log_entity_actiontype_enum_old" AS ENUM('APP_OPEN', 'APP_CLOSE', 'APP_BLOCKED', 'WEB_VISIT', 'WEB_BLOCKED', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'GEOFENCE_DWELL', 'LIMIT_REACHED', 'LIMIT_WARNING', 'DEVICE_LOCK', 'DEVICE_UNLOCK', 'HEARTBEAT', 'INVENTORY_SCAN', 'POLICY_SYNC', 'COMMAND_EXECUTED', 'LOCATION_UPDATE', 'BATTERY_UPDATE', 'TAMPER_DETECTED', 'SETTING_CHANGED', 'VPN_STATUS', 'SOS_PANIC', 'UNLOCK_REQUEST')`);
            yield queryRunner.query(`ALTER TABLE "audit_log_entity" ALTER COLUMN "actionType" TYPE "public"."audit_log_entity_actiontype_enum_old" USING "actionType"::"text"::"public"."audit_log_entity_actiontype_enum_old"`);
            yield queryRunner.query(`DROP TYPE "public"."audit_log_entity_actiontype_enum"`);
            yield queryRunner.query(`ALTER TYPE "public"."audit_log_entity_actiontype_enum_old" RENAME TO "audit_log_entity_actiontype_enum"`);
            yield queryRunner.query(`ALTER TABLE "plan_config_entity" DROP COLUMN "localPriceIds"`);
        });
    }
}
exports.AddActivityActionTypes1772813807082 = AddActivityActionTypes1772813807082;
//# sourceMappingURL=1772813807082-AddActivityActionTypes.js.map