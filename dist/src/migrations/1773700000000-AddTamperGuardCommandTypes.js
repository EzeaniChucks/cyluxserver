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
exports.AddTamperGuardCommandTypes1773700000000 = void 0;
class AddTamperGuardCommandTypes1773700000000 {
    constructor() {
        this.name = 'AddTamperGuardCommandTypes1773700000000';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TYPE "public"."command_entity_type_enum" RENAME TO "command_entity_type_enum_old"`);
            yield queryRunner.query(`CREATE TYPE "public"."command_entity_type_enum" AS ENUM('LOCK', 'UNLOCK', 'PLAY_SIREN', 'SYNC_POLICY', 'WIPE_BROWSER', 'TAKE_SCREENSHOT', 'REMOTE_WIPE', 'REBOOT', 'INVENTORY_SCAN', 'HIDE_ICON', 'SHOW_ICON', 'SET_PARENT_PIN', 'ENABLE_SETTINGS_GUARD', 'DISABLE_SETTINGS_GUARD')`);
            yield queryRunner.query(`ALTER TABLE "command_entity" ALTER COLUMN "type" TYPE "public"."command_entity_type_enum" USING "type"::"text"::"public"."command_entity_type_enum"`);
            yield queryRunner.query(`DROP TYPE "public"."command_entity_type_enum_old"`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TYPE "public"."command_entity_type_enum" RENAME TO "command_entity_type_enum_old"`);
            yield queryRunner.query(`CREATE TYPE "public"."command_entity_type_enum" AS ENUM('LOCK', 'UNLOCK', 'PLAY_SIREN', 'SYNC_POLICY', 'WIPE_BROWSER', 'TAKE_SCREENSHOT', 'REMOTE_WIPE', 'REBOOT', 'INVENTORY_SCAN')`);
            yield queryRunner.query(`ALTER TABLE "command_entity" ALTER COLUMN "type" TYPE "public"."command_entity_type_enum" USING "type"::"text"::"public"."command_entity_type_enum"`);
            yield queryRunner.query(`DROP TYPE "public"."command_entity_type_enum_old"`);
        });
    }
}
exports.AddTamperGuardCommandTypes1773700000000 = AddTamperGuardCommandTypes1773700000000;
//# sourceMappingURL=1773700000000-AddTamperGuardCommandTypes.js.map