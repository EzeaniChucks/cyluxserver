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
exports.AuditLogEntity = void 0;
// server/entities/AuditLog.ts
const typeorm_1 = require("typeorm");
const Child_1 = require("./Child");
let AuditLogEntity = class AuditLogEntity {
};
exports.AuditLogEntity = AuditLogEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)()
    // @Index()
    ,
    __metadata("design:type", String)
], AuditLogEntity.prototype, "childId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: [
            "APP_OPEN", // App opened
            "APP_CLOSE", // App closed
            "APP_BLOCKED", // App blocked attempt
            "WEB_VISIT", // Website visited
            "WEB_BLOCKED", // Website blocked
            "GEOFENCE_ENTER", // ENHANCEMENT: Entered geofence
            "GEOFENCE_EXIT", // ENHANCEMENT: Exited geofence
            "GEOFENCE_DWELL", // ENHANCEMENT: Dwelled in geofence
            "LIMIT_REACHED", // Daily limit reached
            "LIMIT_WARNING", // Near limit warning
            "DEVICE_LOCK", // Device locked
            "DEVICE_UNLOCK", // Device unlocked
            "HEARTBEAT", // Periodic heartbeat
            "INVENTORY_SCAN", // App inventory scan
            "POLICY_SYNC", // Policy synced
            "COMMAND_EXECUTED", // MDM command executed
            "LOCATION_UPDATE", // Location updated
            "BATTERY_UPDATE", // Battery level updated
            "TAMPER_DETECTED", // Device tampering detected
            "SETTING_CHANGED", // Setting changed
            "VPN_STATUS", // VPN status
            "SOS_PANIC", // Child-triggered SOS emergency
            "UNLOCK_REQUEST", // Child requesting extra screen time from lock screen
        ],
    }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "actionType", void 0);
__decorate([
    (0, typeorm_1.Column)("text"),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "details", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false })
    // @Index() // ENHANCEMENT: Index for filtering flagged logs
    ,
    __metadata("design:type", Boolean)
], AuditLogEntity.prototype, "isFlagged", void 0);
__decorate([
    (0, typeorm_1.Column)("jsonb", { nullable: true }),
    __metadata("design:type", Object)
], AuditLogEntity.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)("jsonb", { nullable: true }),
    __metadata("design:type", Object)
], AuditLogEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)()
    // @Index() // ENHANCEMENT: Index for time-based queries
    ,
    __metadata("design:type", Date)
], AuditLogEntity.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "1.0" }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "schemaVersion", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Child_1.ChildEntity, (child) => child.logs)
    // @Index() // ENHANCEMENT: Index for efficient joins
    ,
    __metadata("design:type", Child_1.ChildEntity)
], AuditLogEntity.prototype, "child", void 0);
exports.AuditLogEntity = AuditLogEntity = __decorate([
    (0, typeorm_1.Entity)()
    // @Index(["childId", "timestamp"]) // ENHANCEMENT: Compound index for common queries
], AuditLogEntity);
//# sourceMappingURL=AuditLog.js.map