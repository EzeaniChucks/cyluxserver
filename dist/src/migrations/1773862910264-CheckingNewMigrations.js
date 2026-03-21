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
exports.CheckingNewMigrations1773862910264 = void 0;
class CheckingNewMigrations1773862910264 {
    constructor() {
        this.name = 'CheckingNewMigrations1773862910264';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "network_profile_entity" DROP CONSTRAINT "FK_network_profile_parent"`);
            yield queryRunner.query(`ALTER TABLE "network_profile_entity" ADD CONSTRAINT "FK_87678e46f89980ba70845961576" FOREIGN KEY ("parentId") REFERENCES "parent_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "network_profile_entity" DROP CONSTRAINT "FK_87678e46f89980ba70845961576"`);
            yield queryRunner.query(`ALTER TABLE "network_profile_entity" ADD CONSTRAINT "FK_network_profile_parent" FOREIGN KEY ("parentId") REFERENCES "parent_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        });
    }
}
exports.CheckingNewMigrations1773862910264 = CheckingNewMigrations1773862910264;
//# sourceMappingURL=1773862910264-CheckingNewMigrations.js.map