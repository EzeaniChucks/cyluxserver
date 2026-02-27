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
exports.AlertEntity = void 0;
// server/entities/Alert.ts
const typeorm_1 = require("typeorm");
const Child_1 = require("./Child");
let AlertEntity = class AlertEntity {
};
exports.AlertEntity = AlertEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], AlertEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)()
    // @Index() // ENHANCEMENT: Index for faster queries by child
    ,
    __metadata("design:type", String)
], AlertEntity.prototype, "childId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: [
            "geofence_entry", // ENHANCEMENT: Specific entry alert
            "geofence_exit", // ENHANCEMENT: Specific exit alert
            "geofence_breach", // ENHANCEMENT: Restricted zone violation
            "limit_reached", // Screen time limit reached
            "unsafe_content", // Blocked web content
            "new_app", // New app detected
            "device_tampered", // Root/jailbreak detected
            "device_offline", // No heartbeat
            "battery_low", // Low battery warning
            "policy_violation", // General policy violation
            "sos_emergency", // SOS panic button triggered
            "time_request" // Child requested extra screen time
        ],
    }),
    __metadata("design:type", String)
], AlertEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)("text"),
    __metadata("design:type", String)
], AlertEntity.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)()
    // @Index() // ENHANCEMENT: Index for ordering by date
    ,
    __metadata("design:type", Date)
], AlertEntity.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["info", "warning", "high", "critical"],
        default: "warning",
    }),
    __metadata("design:type", String)
], AlertEntity.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], AlertEntity.prototype, "isResolved", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], AlertEntity.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)("json", { nullable: true }),
    __metadata("design:type", Object)
], AlertEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Child_1.ChildEntity, (child) => child.alerts)
    // @Index() // ENHANCEMENT: Index for joins
    ,
    __metadata("design:type", Child_1.ChildEntity)
], AlertEntity.prototype, "child", void 0);
exports.AlertEntity = AlertEntity = __decorate([
    (0, typeorm_1.Entity)()
], AlertEntity);
//# sourceMappingURL=Alert.js.map