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
exports.CommandEntity = void 0;
const typeorm_1 = require("typeorm");
const Child_1 = require("./Child");
let CommandEntity = class CommandEntity {
};
exports.CommandEntity = CommandEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], CommandEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)()
    // Fix: Added Index import from typeorm to resolve missing name error
    ,
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], CommandEntity.prototype, "childId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: [
            "LOCK",
            "UNLOCK",
            "PLAY_SIREN",
            "SYNC_POLICY",
            "WIPE_BROWSER",
            "REMOTE_WIPE",
            "REBOOT",
            "INVENTORY_SCAN",
        ],
    }),
    __metadata("design:type", String)
], CommandEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)("jsonb", { nullable: true }),
    __metadata("design:type", Object)
], CommandEntity.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "pending" }),
    __metadata("design:type", String)
], CommandEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CommandEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Child_1.ChildEntity),
    __metadata("design:type", Child_1.ChildEntity)
], CommandEntity.prototype, "child", void 0);
exports.CommandEntity = CommandEntity = __decorate([
    (0, typeorm_1.Entity)()
], CommandEntity);
//# sourceMappingURL=Command.js.map