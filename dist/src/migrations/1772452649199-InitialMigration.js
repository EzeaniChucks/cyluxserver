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
exports.InitialMigration1772452649199 = void 0;
class InitialMigration1772452649199 {
    constructor() {
        this.name = 'InitialMigration1772452649199';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "parent_entity" ADD "country" character varying(2)`);
            yield queryRunner.query(`ALTER TABLE "parent_entity" ADD "currency" character varying(10) NOT NULL DEFAULT 'usd'`);
            yield queryRunner.query(`ALTER TABLE "parent_entity" ADD "locale" character varying`);
            yield queryRunner.query(`ALTER TABLE "parent_entity" ADD "vpnFlagged" boolean NOT NULL DEFAULT false`);
            yield queryRunner.query(`ALTER TABLE "parent_entity" ADD "detectedVia" character varying`);
            yield queryRunner.query(`ALTER TABLE "subscription_entity" ADD "billingInterval" character varying NOT NULL DEFAULT 'monthly'`);
            yield queryRunner.query(`ALTER TABLE "plan_config_entity" ADD "stripePriceIdAnnual" character varying`);
            yield queryRunner.query(`ALTER TABLE "plan_config_entity" ADD "contactSalesOnly" boolean NOT NULL DEFAULT false`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "plan_config_entity" DROP COLUMN "contactSalesOnly"`);
            yield queryRunner.query(`ALTER TABLE "plan_config_entity" DROP COLUMN "stripePriceIdAnnual"`);
            yield queryRunner.query(`ALTER TABLE "subscription_entity" DROP COLUMN "billingInterval"`);
            yield queryRunner.query(`ALTER TABLE "parent_entity" DROP COLUMN "detectedVia"`);
            yield queryRunner.query(`ALTER TABLE "parent_entity" DROP COLUMN "vpnFlagged"`);
            yield queryRunner.query(`ALTER TABLE "parent_entity" DROP COLUMN "locale"`);
            yield queryRunner.query(`ALTER TABLE "parent_entity" DROP COLUMN "currency"`);
            yield queryRunner.query(`ALTER TABLE "parent_entity" DROP COLUMN "country"`);
        });
    }
}
exports.InitialMigration1772452649199 = InitialMigration1772452649199;
//# sourceMappingURL=1772452649199-InitialMigration.js.map