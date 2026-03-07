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
exports.PlanConfigEntity = void 0;
const typeorm_1 = require("typeorm");
let PlanConfigEntity = class PlanConfigEntity {
};
exports.PlanConfigEntity = PlanConfigEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PlanConfigEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], PlanConfigEntity.prototype, "planId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PlanConfigEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], PlanConfigEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)('float', { nullable: true }),
    __metadata("design:type", Object)
], PlanConfigEntity.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)('int'),
    __metadata("design:type", Number)
], PlanConfigEntity.prototype, "maxDevices", void 0);
__decorate([
    (0, typeorm_1.Column)('int'),
    __metadata("design:type", Number)
], PlanConfigEntity.prototype, "maxGeofences", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PlanConfigEntity.prototype, "vpnFiltering", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PlanConfigEntity.prototype, "realTimeAlerts", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PlanConfigEntity.prototype, "notificationMonitoring", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PlanConfigEntity.prototype, "callMonitoring", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PlanConfigEntity.prototype, "smsMonitoring", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PlanConfigEntity.prototype, "smartTv", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PlanConfigEntity.prototype, "advancedReports", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PlanConfigEntity.prototype, "schoolDashboard", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], PlanConfigEntity.prototype, "stripePriceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], PlanConfigEntity.prototype, "stripePriceIdAnnual", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PlanConfigEntity.prototype, "contactSalesOnly", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], PlanConfigEntity.prototype, "localPriceIds", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { default: 0 }),
    __metadata("design:type", Number)
], PlanConfigEntity.prototype, "trialDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], PlanConfigEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], PlanConfigEntity.prototype, "updatedByAdminId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PlanConfigEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PlanConfigEntity.prototype, "updatedAt", void 0);
exports.PlanConfigEntity = PlanConfigEntity = __decorate([
    (0, typeorm_1.Entity)('plan_config_entity')
], PlanConfigEntity);
//# sourceMappingURL=PlanConfig.js.map