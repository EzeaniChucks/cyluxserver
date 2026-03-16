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
exports.AddNetworkProfile1773500000000 = void 0;
class AddNetworkProfile1773500000000 {
    constructor() {
        this.name = "AddNetworkProfile1773500000000";
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`
      CREATE TABLE "network_profile_entity" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "parentId" uuid NOT NULL,
        "nextdnsApiKey" character varying,
        "nextdnsProfileId" character varying,
        "nextdnsProfileName" character varying,
        "autoSync" boolean NOT NULL DEFAULT true,
        "enabled" boolean NOT NULL DEFAULT false,
        "extraBlockedDomains" text,
        "lastSyncAt" TIMESTAMP,
        "lastSyncCount" integer NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_network_profile_parentId" UNIQUE ("parentId"),
        CONSTRAINT "PK_network_profile_entity" PRIMARY KEY ("id")
      )
    `);
            yield queryRunner.query(`
      ALTER TABLE "network_profile_entity"
        ADD CONSTRAINT "FK_network_profile_parent"
        FOREIGN KEY ("parentId")
        REFERENCES "parent_entity"("id")
        ON DELETE CASCADE
    `);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "network_profile_entity" DROP CONSTRAINT "FK_network_profile_parent"`);
            yield queryRunner.query(`DROP TABLE "network_profile_entity"`);
        });
    }
}
exports.AddNetworkProfile1773500000000 = AddNetworkProfile1773500000000;
//# sourceMappingURL=1773500000000-AddNetworkProfile.js.map