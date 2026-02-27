"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.PLAN_LIMITS = void 0;
exports.getPlanConfig = getPlanConfig;
exports.seedPlanConfigs = seedPlanConfigs;
exports.getPlansForClientFromDb = getPlansForClientFromDb;
exports.getPlansForClient = getPlansForClient;
exports.PLAN_LIMITS = {
    trial: {
        name: 'Free Trial',
        description: '7-day Premium trial — no credit card required',
        price: 0,
        maxDevices: 3,
        maxGeofences: 5,
        vpnFiltering: true,
        realTimeAlerts: true,
        smartTv: false,
        advancedReports: false,
        schoolDashboard: false,
    },
    basic: {
        name: 'Basic',
        description: 'Essential monitoring for one device',
        price: 4.99,
        maxDevices: 1,
        maxGeofences: 1,
        vpnFiltering: false,
        realTimeAlerts: false,
        smartTv: false,
        advancedReports: false,
        schoolDashboard: false,
        priceId: process.env.STRIPE_PRICE_BASIC,
    },
    premium: {
        name: 'Premium',
        description: 'Full protection for growing families',
        price: 10.99,
        maxDevices: 3,
        maxGeofences: 5,
        vpnFiltering: true,
        realTimeAlerts: true,
        smartTv: false,
        advancedReports: false,
        schoolDashboard: false,
        priceId: process.env.STRIPE_PRICE_PREMIUM,
    },
    premium_plus: {
        name: 'Premium Plus',
        description: 'Unlimited geofences + Smart TV monitoring',
        price: 14.99,
        maxDevices: 5,
        maxGeofences: Infinity,
        vpnFiltering: true,
        realTimeAlerts: true,
        smartTv: true,
        advancedReports: false,
        schoolDashboard: false,
        priceId: process.env.STRIPE_PRICE_PREMIUM_PLUS,
    },
    enterprise: {
        name: 'Enterprise',
        description: 'School dashboard + advanced reports',
        price: 50.99,
        maxDevices: Infinity,
        maxGeofences: Infinity,
        vpnFiltering: true,
        realTimeAlerts: true,
        smartTv: true,
        advancedReports: true,
        schoolDashboard: true,
        priceId: process.env.STRIPE_PRICE_ENTERPRISE,
    },
};
/**
 * Returns a DB-overridden plan config for a given planId.
 * Falls back to hardcoded PLAN_LIMITS if no DB row exists.
 * Lazy import to avoid circular dependency with AppDataSource.
 */
function getPlanConfig(planId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const { AppDataSource } = yield Promise.resolve().then(() => __importStar(require('../database')));
            const { PlanConfigEntity } = yield Promise.resolve().then(() => __importStar(require('../entities/PlanConfig')));
            const repo = AppDataSource.getRepository(PlanConfigEntity);
            const config = yield repo.findOne({ where: { planId, isActive: true } });
            if (!config)
                return exports.PLAN_LIMITS[planId];
            return {
                name: config.name,
                description: config.description,
                price: (_a = config.price) !== null && _a !== void 0 ? _a : exports.PLAN_LIMITS[planId].price,
                maxDevices: config.maxDevices === -1 ? Infinity : config.maxDevices,
                maxGeofences: config.maxGeofences === -1 ? Infinity : config.maxGeofences,
                vpnFiltering: config.vpnFiltering,
                realTimeAlerts: config.realTimeAlerts,
                smartTv: config.smartTv,
                advancedReports: config.advancedReports,
                schoolDashboard: config.schoolDashboard,
                priceId: (_b = config.stripePriceId) !== null && _b !== void 0 ? _b : exports.PLAN_LIMITS[planId].priceId,
            };
        }
        catch (_c) {
            return exports.PLAN_LIMITS[planId];
        }
    });
}
/**
 * Seeds plan_config_entity from hardcoded defaults on first run.
 * No-op if rows already exist.
 */
function seedPlanConfigs() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const { AppDataSource } = yield Promise.resolve().then(() => __importStar(require('../database')));
            const { PlanConfigEntity } = yield Promise.resolve().then(() => __importStar(require('../entities/PlanConfig')));
            const repo = AppDataSource.getRepository(PlanConfigEntity);
            const existing = yield repo.count();
            if (existing > 0)
                return;
            const entries = Object.entries(exports.PLAN_LIMITS);
            for (const [planId, plan] of entries) {
                yield repo.save(repo.create({
                    planId,
                    name: plan.name,
                    description: plan.description,
                    price: (_a = plan.price) !== null && _a !== void 0 ? _a : 0,
                    maxDevices: plan.maxDevices === Infinity ? -1 : plan.maxDevices,
                    maxGeofences: plan.maxGeofences === Infinity ? -1 : plan.maxGeofences,
                    vpnFiltering: plan.vpnFiltering,
                    realTimeAlerts: plan.realTimeAlerts,
                    smartTv: plan.smartTv,
                    advancedReports: plan.advancedReports,
                    schoolDashboard: plan.schoolDashboard,
                    stripePriceId: (_b = plan.priceId) !== null && _b !== void 0 ? _b : null,
                    trialDays: planId === 'trial' ? 7 : 0,
                }));
            }
            console.log('[Plans] Seeded plan configs from defaults');
        }
        catch (err) {
            console.error('[Plans] Failed to seed plan configs:', err.message);
        }
    });
}
/**
 * Returns a serialisable version of plan configs from DB (with hardcoded fallback).
 * Replaces Infinity / -1 with -1 for JSON consistency.
 */
function getPlansForClientFromDb() {
    return __awaiter(this, void 0, void 0, function* () {
        const planIds = ['basic', 'premium', 'premium_plus', 'enterprise'];
        const results = yield Promise.all(planIds.map((id) => __awaiter(this, void 0, void 0, function* () {
            const plan = yield getPlanConfig(id);
            return {
                id,
                name: plan.name,
                description: plan.description,
                price: plan.price,
                features: {
                    maxDevices: plan.maxDevices === Infinity ? -1 : plan.maxDevices,
                    maxGeofences: plan.maxGeofences === Infinity ? -1 : plan.maxGeofences,
                    vpnFiltering: plan.vpnFiltering,
                    realTimeAlerts: plan.realTimeAlerts,
                    smartTv: plan.smartTv,
                    advancedReports: plan.advancedReports,
                    schoolDashboard: plan.schoolDashboard,
                },
                priceId: plan.priceId || null,
            };
        })));
        return results;
    });
}
/** Returns a serialisable version of PLAN_LIMITS (replaces Infinity with -1 for JSON). */
function getPlansForClient() {
    return Object.entries(exports.PLAN_LIMITS)
        .filter(([id]) => id !== 'trial')
        .map(([id, plan]) => ({
        id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        features: {
            maxDevices: plan.maxDevices === Infinity ? -1 : plan.maxDevices,
            maxGeofences: plan.maxGeofences === Infinity ? -1 : plan.maxGeofences,
            vpnFiltering: plan.vpnFiltering,
            realTimeAlerts: plan.realTimeAlerts,
            smartTv: plan.smartTv,
            advancedReports: plan.advancedReports,
            schoolDashboard: plan.schoolDashboard,
        },
        priceId: plan.priceId || null,
    }));
}
//# sourceMappingURL=plans.js.map