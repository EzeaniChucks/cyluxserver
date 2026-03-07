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
exports.AddPlanMonitoringFlags1772865834220 = void 0;
class AddPlanMonitoringFlags1772865834220 {
    constructor() {
        this.name = 'AddPlanMonitoringFlags1772865834220';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "plan_config_entity" ADD "notificationMonitoring" boolean NOT NULL DEFAULT false`);
            yield queryRunner.query(`ALTER TABLE "plan_config_entity" ADD "callMonitoring" boolean NOT NULL DEFAULT false`);
            yield queryRunner.query(`ALTER TABLE "plan_config_entity" ADD "smsMonitoring" boolean NOT NULL DEFAULT false`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "plan_config_entity" DROP COLUMN "smsMonitoring"`);
            yield queryRunner.query(`ALTER TABLE "plan_config_entity" DROP COLUMN "callMonitoring"`);
            yield queryRunner.query(`ALTER TABLE "plan_config_entity" DROP COLUMN "notificationMonitoring"`);
        });
    }
}
exports.AddPlanMonitoringFlags1772865834220 = AddPlanMonitoringFlags1772865834220;
//# sourceMappingURL=1772865834220-AddPlanMonitoringFlags.js.map