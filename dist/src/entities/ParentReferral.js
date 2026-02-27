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
exports.ParentReferralEntity = void 0;
const typeorm_1 = require("typeorm");
const Parent_1 = require("./Parent");
let ParentReferralEntity = class ParentReferralEntity {
};
exports.ParentReferralEntity = ParentReferralEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ParentReferralEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ParentReferralEntity.prototype, "referrerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Parent_1.ParentEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'referrerId' }),
    __metadata("design:type", Parent_1.ParentEntity)
], ParentReferralEntity.prototype, "referrer", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ParentReferralEntity.prototype, "referredId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Parent_1.ParentEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'referredId' }),
    __metadata("design:type", Parent_1.ParentEntity)
], ParentReferralEntity.prototype, "referred", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'registered' }),
    __metadata("design:type", String)
], ParentReferralEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ParentReferralEntity.prototype, "plan", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { nullable: true }),
    __metadata("design:type", Object)
], ParentReferralEntity.prototype, "firstPaymentAmountCents", void 0);
__decorate([
    (0, typeorm_1.Column)('float', { nullable: true }),
    __metadata("design:type", Object)
], ParentReferralEntity.prototype, "rewardValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ParentReferralEntity.prototype, "rewardType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], ParentReferralEntity.prototype, "rewardGrantedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ParentReferralEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ParentReferralEntity.prototype, "updatedAt", void 0);
exports.ParentReferralEntity = ParentReferralEntity = __decorate([
    (0, typeorm_1.Entity)('parent_referral_entity')
], ParentReferralEntity);
//# sourceMappingURL=ParentReferral.js.map