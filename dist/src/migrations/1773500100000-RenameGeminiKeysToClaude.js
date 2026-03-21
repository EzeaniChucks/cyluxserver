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
exports.RenameGeminiKeysToClaude1773500100000 = void 0;
class RenameGeminiKeysToClaude1773500100000 {
    constructor() {
        this.name = 'RenameGeminiKeysToClaude1773500100000';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "system_config_entity" RENAME COLUMN "geminiApiKey" TO "claudeApiKey"`);
            yield queryRunner.query(`ALTER TABLE "system_config_entity" RENAME COLUMN "geminiKeyStatus" TO "claudeKeyStatus"`);
            yield queryRunner.query(`ALTER TABLE "system_config_entity" RENAME COLUMN "geminiKeyLastError" TO "claudeKeyLastError"`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "system_config_entity" RENAME COLUMN "claudeApiKey" TO "geminiApiKey"`);
            yield queryRunner.query(`ALTER TABLE "system_config_entity" RENAME COLUMN "claudeKeyStatus" TO "geminiKeyStatus"`);
            yield queryRunner.query(`ALTER TABLE "system_config_entity" RENAME COLUMN "claudeKeyLastError" TO "geminiKeyLastError"`);
        });
    }
}
exports.RenameGeminiKeysToClaude1773500100000 = RenameGeminiKeysToClaude1773500100000;
//# sourceMappingURL=1773500100000-RenameGeminiKeysToClaude.js.map