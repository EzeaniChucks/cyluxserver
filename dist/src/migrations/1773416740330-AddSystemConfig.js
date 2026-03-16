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
exports.AddSystemConfig1773416740330 = void 0;
class AddSystemConfig1773416740330 {
    constructor() {
        this.name = 'AddSystemConfig1773416740330';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`CREATE TABLE "system_config_entity" ("id" character varying(20) NOT NULL, "geminiApiKey" character varying, "geminiKeyStatus" character varying NOT NULL DEFAULT 'unconfigured', "geminiKeyLastError" text, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_63dc73cbb607fede4fbe94b24b6" PRIMARY KEY ("id"))`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`DROP TABLE "system_config_entity"`);
        });
    }
}
exports.AddSystemConfig1773416740330 = AddSystemConfig1773416740330;
//# sourceMappingURL=1773416740330-AddSystemConfig.js.map