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
 * SmartDeviceEntity — stores a parent's connected smart TV device.
 *
 * Supported platforms:
 *
 *  "smartthings"     Samsung Smart TVs via the SmartThings cloud API.
 *                    OAuth 2.0 tokens are stored here; the service refreshes
 *                    them automatically when they expire.
 *
 *  "home_assistant"  LG, Philips, Vizio, and any other brand whose TV is
 *                    managed by a local Home Assistant instance.
 *                    Parent provides the HA URL + a long-lived access token.
 *                    No refresh token needed — HA tokens don't expire.
 *
 * Enforcement hook:
 *   When a parent queues a LOCK command for a child, ChildService.queueCommand()
 *   calls SmartDeviceService.controlByChild(childId, 'off') to power off the
 *   linked TV.  UNLOCK calls controlByChild(childId, 'on').
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