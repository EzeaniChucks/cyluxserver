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
exports.AddSmartDeviceKindAndTracker1772765661302 = void 0;
class AddSmartDeviceKindAndTracker1772765661302 {
    constructor() {
        this.name = 'AddSmartDeviceKindAndTracker1772765661302';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "smart_devices" ADD "deviceKind" character varying NOT NULL DEFAULT 'tv'`);
            yield queryRunner.query(`ALTER TABLE "smart_devices" ADD "lastLocation" jsonb`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "smart_devices" DROP COLUMN "lastLocation"`);
            yield queryRunner.query(`ALTER TABLE "smart_devices" DROP COLUMN "deviceKind"`);
        });
    }
}
exports.AddSmartDeviceKindAndTracker1772765661302 = AddSmartDeviceKindAndTracker1772765661302;
//# sourceMappingURL=1772765661302-AddSmartDeviceKindAndTracker.js.map