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
exports.HonourClientTimestamp1772925906812 = void 0;
class HonourClientTimestamp1772925906812 {
    constructor() {
        this.name = 'HonourClientTimestamp1772925906812';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "audit_log_entity" DROP COLUMN "timestamp"`);
            yield queryRunner.query(`ALTER TABLE "audit_log_entity" ADD "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "audit_log_entity" DROP COLUMN "timestamp"`);
            yield queryRunner.query(`ALTER TABLE "audit_log_entity" ADD "timestamp" TIMESTAMP NOT NULL DEFAULT now()`);
        });
    }
}
exports.HonourClientTimestamp1772925906812 = HonourClientTimestamp1772925906812;
//# sourceMappingURL=1772925906812-HonourClientTimestamp.js.map