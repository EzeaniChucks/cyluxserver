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
exports.NetworkProfileEntity = void 0;
const typeorm_1 = require("typeorm");
const Parent_1 = require("./Parent");
/**
 * NetworkProfileEntity — stores a parent's home-network DNS filtering config.
 * Integrates with NextDNS to push blocked domains from all child policies onto
 * the family's NextDNS profile, so any device on the home network (Roku, smart
 * TVs, consoles, etc.) is subject to the same content filtering.
 */
let NetworkProfileEntity = class NetworkProfileEntity {
};
exports.NetworkProfileEntity = NetworkProfileEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], NetworkProfileEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => Parent_1.ParentEntity, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", Parent_1.ParentEntity)
], NetworkProfileEntity.prototype, "parent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], NetworkProfileEntity.prototype, "parentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], NetworkProfileEntity.prototype, "nextdnsApiKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], NetworkProfileEntity.prototype, "nextdnsProfileId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Object)
], NetworkProfileEntity.prototype, "nextdnsProfileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], NetworkProfileEntity.prototype, "autoSync", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], NetworkProfileEntity.prototype, "enabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "simple-array", nullable: true }),
    __metadata("design:type", Object)
], NetworkProfileEntity.prototype, "extraBlockedDomains", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Object)
], NetworkProfileEntity.prototype, "lastSyncAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], NetworkProfileEntity.prototype, "lastSyncCount", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], NetworkProfileEntity.prototype, "updatedAt", void 0);
exports.NetworkProfileEntity = NetworkProfileEntity = __decorate([
    (0, typeorm_1.Entity)("network_profile_entity")
], NetworkProfileEntity);
//# sourceMappingURL=NetworkProfile.js.map