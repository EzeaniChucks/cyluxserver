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
exports.InfluencerEntity = void 0;
const typeorm_1 = require("typeorm");
const Referral_1 = require("./Referral");
let InfluencerEntity = class InfluencerEntity {
};
exports.InfluencerEntity = InfluencerEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], InfluencerEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], InfluencerEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], InfluencerEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], InfluencerEntity.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], InfluencerEntity.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)('float', { default: 20 }),
    __metadata("design:type", Number)
], InfluencerEntity.prototype, "discountPercent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], InfluencerEntity.prototype, "stripeCouponId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], InfluencerEntity.prototype, "rewardType", void 0);
__decorate([
    (0, typeorm_1.Column)('float', { nullable: true }),
    __metadata("design:type", Object)
], InfluencerEntity.prototype, "rewardValue", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { default: 0 }),
    __metadata("design:type", Number)
], InfluencerEntity.prototype, "totalReferrals", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { default: 0 }),
    __metadata("design:type", Number)
], InfluencerEntity.prototype, "totalConversions", void 0);
__decorate([
    (0, typeorm_1.Column)('float', { default: 0 }),
    __metadata("design:type", Number)
], InfluencerEntity.prototype, "totalEarningsUsd", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], InfluencerEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Referral_1.ReferralEntity, r => r.influencer),
    __metadata("design:type", Array)
], InfluencerEntity.prototype, "referrals", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], InfluencerEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], InfluencerEntity.prototype, "updatedAt", void 0);
exports.InfluencerEntity = InfluencerEntity = __decorate([
    (0, typeorm_1.Entity)('influencer_entity')
], InfluencerEntity);
//# sourceMappingURL=Influencer.js.map