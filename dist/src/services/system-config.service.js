"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemConfigService = void 0;
const database_1 = require("../database");
const SystemConfig_1 = require("../entities/SystemConfig");
const repo = () => database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfigEntity);
class SystemConfigService {
    /** Returns (or seeds) the single system config row. */
    getConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            let config = yield repo().findOne({ where: { id: 'default' } });
            if (!config) {
                // Seed from env vars on first access so existing deployments don't break
                config = yield repo().save(repo().create({
                    id: 'default',
                    geminiApiKey: process.env.GEMINI_API_KEY || null,
                    geminiKeyStatus: process.env.GEMINI_API_KEY ? 'unconfigured' : 'unconfigured',
                    geminiKeyLastError: null,
                }));
            }
            return config;
        });
    }
    /** Returns the Gemini key — DB row first, env var fallback. */
    getGeminiKey() {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield this.getConfig();
            return config.geminiApiKey || process.env.GEMINI_API_KEY || null;
        });
    }
    updateConfig(patch) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield this.getConfig();
            if (patch.geminiApiKey !== undefined) {
                config.geminiApiKey = patch.geminiApiKey || null;
                // Reset status so the next AI call re-validates the new key
                config.geminiKeyStatus = 'unconfigured';
                config.geminiKeyLastError = null;
            }
            return repo().save(config);
        });
    }
    recordGeminiSuccess() {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield this.getConfig();
            if (config.geminiKeyStatus !== 'ok') {
                config.geminiKeyStatus = 'ok';
                config.geminiKeyLastError = null;
                yield repo().save(config);
            }
        });
    }
    recordGeminiError(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield this.getConfig();
            config.geminiKeyStatus = 'error';
            config.geminiKeyLastError = message;
            yield repo().save(config);
        });
    }
}
exports.systemConfigService = new SystemConfigService();
//# sourceMappingURL=system-config.service.js.map