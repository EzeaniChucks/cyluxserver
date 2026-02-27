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
exports.ParentReferralConfigEntity = void 0;
const typeorm_1 = require("typeorm");
let ParentReferralConfigEntity = class ParentReferralConfigEntity {
};
exports.ParentReferralConfigEntity = ParentReferralConfigEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ParentReferralConfigEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], ParentReferralConfigEntity.prototype, "isEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'trial_extension_days' }),
    __metadata("design:type", String)
], ParentReferralConfigEntity.prototype, "rewardType", void 0);
__decorate([
    (0, typeorm_1.Column)('float', { default: 7 }),
    __metadata("design:type", Number)
], ParentReferralConfigEntity.prototype, "rewardValue", void 0);
__decorate([
    (0, typeorm_1.Column)('float', { default: 0 }),
    __metadata("design:type", Number)
], ParentReferralConfigEntity.prototype, "referredDiscountPercent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ParentReferralConfigEntity.prototype, "updatedByAdminId", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ParentReferralConfigEntity.prototype, "updatedAt", void 0);
exports.ParentReferralConfigEntity = ParentReferralConfigEntity = __decorate([
    (0, typeorm_1.Entity)('parent_referral_config_entity')
], ParentReferralConfigEntity);
//# sourceMappingURL=ParentReferralConfig.js.map