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
exports.ReferralEntity = void 0;
const typeorm_1 = require("typeorm");
const Influencer_1 = require("./Influencer");
const Parent_1 = require("./Parent");
let ReferralEntity = class ReferralEntity {
};
exports.ReferralEntity = ReferralEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ReferralEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ReferralEntity.prototype, "influencerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Influencer_1.InfluencerEntity, i => i.referrals, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'influencerId' }),
    __metadata("design:type", Influencer_1.InfluencerEntity)
], ReferralEntity.prototype, "influencer", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ReferralEntity.prototype, "referredParentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Parent_1.ParentEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'referredParentId' }),
    __metadata("design:type", Parent_1.ParentEntity)
], ReferralEntity.prototype, "referredParent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'registered' }),
    __metadata("design:type", String)
], ReferralEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)('float', { default: 0 }),
    __metadata("design:type", Number)
], ReferralEntity.prototype, "discountPercent", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { nullable: true }),
    __metadata("design:type", Object)
], ReferralEntity.prototype, "firstPaymentAmountCents", void 0);
__decorate([
    (0, typeorm_1.Column)('float', { nullable: true }),
    __metadata("design:type", Object)
], ReferralEntity.prototype, "rewardAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ReferralEntity.prototype, "rewardType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], ReferralEntity.prototype, "rewardPaidAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ReferralEntity.prototype, "plan", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ReferralEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ReferralEntity.prototype, "updatedAt", void 0);
exports.ReferralEntity = ReferralEntity = __decorate([
    (0, typeorm_1.Entity)('referral_entity')
], ReferralEntity);
//# sourceMappingURL=Referral.js.map