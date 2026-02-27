"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutConfigEntity = void 0;
const typeorm_1 = require("typeorm");
let PayoutConfigEntity = class PayoutConfigEntity {
};
exports.PayoutConfigEntity = PayoutConfigEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PayoutConfigEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 20 }),
    __metadata("design:type", Number)
], PayoutConfigEntity.prototype, "minWithdrawalUsdInfluencer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 10 }),
    __metadata("design:type", Number)
], PayoutConfigEntity.prototype, "minWithdrawalUsdParent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 14 }),
    __metadata("design:type", Number)
], PayoutConfigEntity.prototype, "holdDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], PayoutConfigEntity.prototype, "updatedByAdminId", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PayoutConfigEntity.prototype, "updatedAt", void 0);
exports.PayoutConfigEntity = PayoutConfigEntity = __decorate([
    (0, typeorm_1.Entity)('payout_config_entity')
], PayoutConfigEntity);
//# sourceMappingURL=PayoutConfig.js.map