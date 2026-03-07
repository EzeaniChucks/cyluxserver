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
exports.SmartDeviceEntity = void 0;
const typeorm_1 = require("typeorm");
const Parent_1 = require("./Parent");
/**
 * SmartDeviceEntity — stores a parent's connected smart device (TV or tracker).
 *
 * deviceKind:
 *  "tv"       Power-controllable TV (SmartThings or Home Assistant)
 *  "tracker"  Location tracker (Samsung SmartTag via SmartThings)
 *
 * Supported platforms:
 *  "smartthings"    Samsung devices via the SmartThings cloud API (TVs + SmartTags)
 *  "home_assistant" LG, Philips, Vizio, etc. via a local Home Assistant instance
 */
let SmartDeviceEntity = class SmartDeviceEntity {
};
exports.SmartDeviceEntity = SmartDeviceEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], SmartDeviceEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SmartDeviceEntity.prototype, "parentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Parent_1.ParentEntity, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "parentId" }),
    __metadata("design:type", Parent_1.ParentEntity)
], SmartDeviceEntity.prototype, "parent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", default: "tv" }),
    __metadata("design:type", String)
], SmartDeviceEntity.prototype, "deviceKind", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar" }),
    __metadata("design:type", String)
], SmartDeviceEntity.prototype, "platform", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SmartDeviceEntity.prototype, "externalDeviceId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SmartDeviceEntity.prototype, "deviceName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], SmartDeviceEntity.prototype, "accessToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", Object)
], SmartDeviceEntity.prototype, "refreshToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamptz", nullable: true }),
    __metadata("design:type", Object)
], SmartDeviceEntity.prototype, "tokenExpiry", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], SmartDeviceEntity.prototype, "baseUrl", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], SmartDeviceEntity.prototype, "linkedChildId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Object)
], SmartDeviceEntity.prototype, "lastLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], SmartDeviceEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamptz", nullable: true }),
    __metadata("design:type", Object)
], SmartDeviceEntity.prototype, "lastControlledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], SmartDeviceEntity.prototype, "lastAction", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SmartDeviceEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SmartDeviceEntity.prototype, "updatedAt", void 0);
exports.SmartDeviceEntity = SmartDeviceEntity = __decorate([
    (0, typeorm_1.Entity)("smart_devices")
], SmartDeviceEntity);
//# sourceMappingURL=SmartDevice.js.map