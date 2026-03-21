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
exports.ChildEntity = void 0;
const typeorm_1 = require("typeorm");
const Parent_1 = require("./Parent");
const AuditLog_1 = require("./AuditLog");
const Alert_1 = require("./Alert");
let ChildEntity = class ChildEntity {
};
exports.ChildEntity = ChildEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], ChildEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ChildEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "active" }),
    __metadata("design:type", String)
], ChildEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], ChildEntity.prototype, "isEnrolled", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "compliant" }),
    __metadata("design:type", String)
], ChildEntity.prototype, "complianceStatus", void 0);
__decorate([
    (0, typeorm_1.Column)("int", { default: 100 }),
    __metadata("design:type", Number)
], ChildEntity.prototype, "battery", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ChildEntity.prototype, "fcmToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], ChildEntity.prototype, "deviceType", void 0);
__decorate([
    (0, typeorm_1.Column)("jsonb", { nullable: true }),
    __metadata("design:type", Object)
], ChildEntity.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)("int", { default: 120 }),
    __metadata("design:type", Number)
], ChildEntity.prototype, "dailyLimitMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)("int", { default: 0 }),
    __metadata("design:type", Number)
], ChildEntity.prototype, "usedMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)("jsonb", {
        default: {
            blockedDomains: [],
            allowedDomains: [],
            categoryFiltering: true,
        },
    }),
    __metadata("design:type", Object)
], ChildEntity.prototype, "webFilter", void 0);
__decorate([
    (0, typeorm_1.Column)("jsonb", { default: [] }),
    __metadata("design:type", Array)
], ChildEntity.prototype, "blockedApps", void 0);
__decorate([
    (0, typeorm_1.Column)("jsonb", { default: [] }),
    __metadata("design:type", Array)
], ChildEntity.prototype, "geofences", void 0);
__decorate([
    (0, typeorm_1.Column)("jsonb", { nullable: true }),
    __metadata("design:type", Object)
], ChildEntity.prototype, "geofenceStats", void 0);
__decorate([
    (0, typeorm_1.Column)("jsonb", { default: [] }),
    __metadata("design:type", Array)
], ChildEntity.prototype, "locationHistory", void 0);
__decorate([
    (0, typeorm_1.Column)("jsonb", { default: [] }),
    __metadata("design:type", Array)
], ChildEntity.prototype, "schedules", void 0);
__decorate([
    (0, typeorm_1.Column)("jsonb", { default: [] }),
    __metadata("design:type", Array)
], ChildEntity.prototype, "appUsage", void 0);
__decorate([
    (0, typeorm_1.Column)("jsonb", { default: {} }),
    __metadata("design:type", Object)
], ChildEntity.prototype, "usageHistory", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Date)
], ChildEntity.prototype, "lastSeen", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], ChildEntity.prototype, "lastInventoryScan", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ChildEntity.prototype, "deviceJwt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ChildEntity.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], ChildEntity.prototype, "iconHidden", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], ChildEntity.prototype, "settingsGuardEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true, default: null }),
    __metadata("design:type", Object)
], ChildEntity.prototype, "aiReport", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, default: null }),
    __metadata("design:type", Object)
], ChildEntity.prototype, "aiReportDate", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Parent_1.ParentEntity, (parent) => parent.children),
    __metadata("design:type", Parent_1.ParentEntity)
], ChildEntity.prototype, "parent", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => AuditLog_1.AuditLogEntity, (log) => log.child),
    __metadata("design:type", Array)
], ChildEntity.prototype, "logs", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Alert_1.AlertEntity, (alert) => alert.child),
    __metadata("design:type", Array)
], ChildEntity.prototype, "alerts", void 0);
exports.ChildEntity = ChildEntity = __decorate([
    (0, typeorm_1.Entity)()
], ChildEntity);
//# sourceMappingURL=Child.js.map