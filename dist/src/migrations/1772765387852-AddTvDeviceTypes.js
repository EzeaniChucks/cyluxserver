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
exports.AddTvDeviceTypes1772765387852 = void 0;
class AddTvDeviceTypes1772765387852 {
    constructor() {
        this.name = 'AddTvDeviceTypes1772765387852';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "child_entity" DROP COLUMN "deviceType"`);
            yield queryRunner.query(`DROP TYPE "public"."child_entity_devicetype_enum"`);
            yield queryRunner.query(`ALTER TABLE "child_entity" ADD "deviceType" character varying`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "child_entity" DROP COLUMN "deviceType"`);
            yield queryRunner.query(`CREATE TYPE "public"."child_entity_devicetype_enum" AS ENUM('ios', 'android')`);
            yield queryRunner.query(`ALTER TABLE "child_entity" ADD "deviceType" "public"."child_entity_devicetype_enum"`);
        });
    }
}
exports.AddTvDeviceTypes1772765387852 = AddTvDeviceTypes1772765387852;
//# sourceMappingURL=1772765387852-AddTvDeviceTypes.js.map