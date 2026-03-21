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
exports.AddChildIconGuardState1773900000000 = void 0;
class AddChildIconGuardState1773900000000 {
    constructor() {
        this.name = 'AddChildIconGuardState1773900000000';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "child_entity" ADD COLUMN IF NOT EXISTS "iconHidden" boolean NOT NULL DEFAULT false`);
            yield queryRunner.query(`ALTER TABLE "child_entity" ADD COLUMN IF NOT EXISTS "settingsGuardEnabled" boolean NOT NULL DEFAULT false`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "child_entity" DROP COLUMN IF EXISTS "settingsGuardEnabled"`);
            yield queryRunner.query(`ALTER TABLE "child_entity" DROP COLUMN IF EXISTS "iconHidden"`);
        });
    }
}
exports.AddChildIconGuardState1773900000000 = AddChildIconGuardState1773900000000;
//# sourceMappingURL=1773900000000-AddChildIconGuardState.js.map