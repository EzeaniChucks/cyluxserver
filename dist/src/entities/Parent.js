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
exports.ParentEntity = void 0;
const typeorm_1 = require("typeorm");
const Child_1 = require("./Child");
const Subscription_1 = require("./Subscription");
let ParentEntity = class ParentEntity {
};
exports.ParentEntity = ParentEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ParentEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], ParentEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ParentEntity.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ParentEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ParentEntity.prototype, "fcmToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: ["ios", "android"], nullable: true }),
    __metadata("design:type", String)
], ParentEntity.prototype, "deviceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ParentEntity.prototype, "resetPasswordToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], ParentEntity.prototype, "resetPasswordExpires", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ParentEntity.prototype, "failedLoginAttempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], ParentEntity.prototype, "lockedUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ParentEntity.prototype, "referralCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, unique: true }),
    __metadata("design:type", Object)
], ParentEntity.prototype, "ownReferralCode", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Child_1.ChildEntity, child => child.parent),
    __metadata("design:type", Array)
], ParentEntity.prototype, "children", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => Subscription_1.SubscriptionEntity, sub => sub.parent, { nullable: true, eager: false }),
    __metadata("design:type", Object)
], ParentEntity.prototype, "subscription", void 0);
exports.ParentEntity = ParentEntity = __decorate([
    (0, typeorm_1.Entity)()
], ParentEntity);
//# sourceMappingURL=Parent.js.map