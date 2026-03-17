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
exports.AddSocialContentActionType1773600000000 = void 0;
class AddSocialContentActionType1773600000000 {
    constructor() {
        this.name = 'AddSocialContentActionType1773600000000';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TYPE "public"."audit_log_entity_actiontype_enum" ADD VALUE IF NOT EXISTS 'SOCIAL_CONTENT'`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Postgres does not support removing enum values without recreating the type.
            // To roll back: rename old type, create new type without SOCIAL_CONTENT,
            // cast existing rows (which would error if any SOCIAL_CONTENT rows exist),
            // then drop the old type. Leaving as no-op for safety.
        });
    }
}
exports.AddSocialContentActionType1773600000000 = AddSocialContentActionType1773600000000;
//# sourceMappingURL=1773600000000-AddSocialContentActionType.js.map