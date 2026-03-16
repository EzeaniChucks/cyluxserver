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
exports.SystemConfigEntity = void 0;
const typeorm_1 = require("typeorm");
/**
 * Single-row table (id='default') for system-wide runtime configuration.
 * Allows superadmins to update sensitive settings (like API keys) without
 * redeploying the server or editing environment files.
 *
 * On first boot the row is seeded from env vars (if present) so existing
 * deployments continue to work without any manual migration step.
 */
let SystemConfigEntity = class SystemConfigEntity {
};
exports.SystemConfigEntity = SystemConfigEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], SystemConfigEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, default: null }),
    __metadata("design:type", Object)
], SystemConfigEntity.prototype, "geminiApiKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'unconfigured' }),
    __metadata("design:type", String)
], SystemConfigEntity.prototype, "geminiKeyStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, default: null }),
    __metadata("design:type", Object)
], SystemConfigEntity.prototype, "geminiKeyLastError", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SystemConfigEntity.prototype, "updatedAt", void 0);
exports.SystemConfigEntity = SystemConfigEntity = __decorate([
    (0, typeorm_1.Entity)('system_config_entity')
], SystemConfigEntity);
//# sourceMappingURL=SystemConfig.js.map