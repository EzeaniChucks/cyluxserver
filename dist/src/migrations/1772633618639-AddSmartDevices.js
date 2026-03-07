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
exports.AddSmartDevices1772633618639 = void 0;
class AddSmartDevices1772633618639 {
    constructor() {
        this.name = 'AddSmartDevices1772633618639';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`CREATE TABLE "smart_devices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "parentId" uuid NOT NULL, "platform" character varying NOT NULL, "externalDeviceId" character varying NOT NULL, "deviceName" character varying NOT NULL, "accessToken" text NOT NULL, "refreshToken" text, "tokenExpiry" TIMESTAMP WITH TIME ZONE, "baseUrl" character varying, "linkedChildId" character varying, "isActive" boolean NOT NULL DEFAULT true, "lastControlledAt" TIMESTAMP WITH TIME ZONE, "lastAction" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_319e203c8251f280e50298762be" PRIMARY KEY ("id"))`);
            yield queryRunner.query(`CREATE INDEX "IDX_8fe743af8f952ff728c17fd199" ON "smart_devices" ("parentId") `);
            yield queryRunner.query(`CREATE INDEX "IDX_c9db7b2c17b64a2a51976faa94" ON "smart_devices" ("linkedChildId") `);
            yield queryRunner.query(`ALTER TABLE "smart_devices" ADD CONSTRAINT "FK_8fe743af8f952ff728c17fd199a" FOREIGN KEY ("parentId") REFERENCES "parent_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "smart_devices" DROP CONSTRAINT "FK_8fe743af8f952ff728c17fd199a"`);
            yield queryRunner.query(`DROP INDEX "public"."IDX_c9db7b2c17b64a2a51976faa94"`);
            yield queryRunner.query(`DROP INDEX "public"."IDX_8fe743af8f952ff728c17fd199"`);
            yield queryRunner.query(`DROP TABLE "smart_devices"`);
        });
    }
}
exports.AddSmartDevices1772633618639 = AddSmartDevices1772633618639;
//# sourceMappingURL=1772633618639-AddSmartDevices.js.map