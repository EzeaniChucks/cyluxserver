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
exports.AddRewardEntity1772825604035 = void 0;
class AddRewardEntity1772825604035 {
    constructor() {
        this.name = 'AddRewardEntity1772825604035';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`CREATE TABLE "reward_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "parentId" character varying NOT NULL, "childId" character varying NOT NULL, "minutes" integer NOT NULL, "reason" character varying, "claimed" boolean NOT NULL DEFAULT false, "claimedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4d86733b11358cd7eda87e9d8b1" PRIMARY KEY ("id"))`);
            yield queryRunner.query(`CREATE INDEX "IDX_7466c04caf5a366b5f71e8d4e8" ON "reward_entity" ("childId") `);
            yield queryRunner.query(`CREATE INDEX "IDX_0c6aed18b5e4ba0efaf614042f" ON "reward_entity" ("childId", "claimed") `);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`DROP INDEX "public"."IDX_0c6aed18b5e4ba0efaf614042f"`);
            yield queryRunner.query(`DROP INDEX "public"."IDX_7466c04caf5a366b5f71e8d4e8"`);
            yield queryRunner.query(`DROP TABLE "reward_entity"`);
        });
    }
}
exports.AddRewardEntity1772825604035 = AddRewardEntity1772825604035;
//# sourceMappingURL=1772825604035-AddRewardEntity.js.map