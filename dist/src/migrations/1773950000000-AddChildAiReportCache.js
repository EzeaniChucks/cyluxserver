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
exports.AddChildAiReportCache1773950000000 = void 0;
class AddChildAiReportCache1773950000000 {
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "child_entity" ADD COLUMN IF NOT EXISTS "aiReport" jsonb DEFAULT NULL`);
            yield queryRunner.query(`ALTER TABLE "child_entity" ADD COLUMN IF NOT EXISTS "aiReportDate" varchar DEFAULT NULL`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "child_entity" DROP COLUMN IF EXISTS "aiReportDate"`);
            yield queryRunner.query(`ALTER TABLE "child_entity" DROP COLUMN IF EXISTS "aiReport"`);
        });
    }
}
exports.AddChildAiReportCache1773950000000 = AddChildAiReportCache1773950000000;
//# sourceMappingURL=1773950000000-AddChildAiReportCache.js.map