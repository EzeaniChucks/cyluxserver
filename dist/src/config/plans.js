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
/**
 * Hardcoded defaults — used only for first-boot seeding and as a
 * last-resort fallback when the DB is unreachable.
 * Source of truth after first boot is plan_config_entity in the DB.
 */
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
        priceId: process.env.STRIPE_PRICE_BASIC_MONTHLY,
        stripePriceIdAnnual: process.env.STRIPE_PRICE_BASIC_ANNUAL,
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
        priceId: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
        stripePriceIdAnnual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
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
        priceId: process.env.STRIPE_PRICE_PREMIUM_PLUS_MONTHLY,
        stripePriceIdAnnual: process.env.STRIPE_PRICE_PREMIUM_PLUS_ANNUAL,
    },
    enterprise: {
        name: 'Enterprise',
        description: 'School dashboard + advanced reports — contact us for pricing',
        price: null,
        maxDevices: Infinity,
        maxGeofences: Infinity,
        vpnFiltering: true,
        realTimeAlerts: true,
        smartTv: true,
        advancedReports: true,
        schoolDashboard: true,
        contactSalesOnly: true,
    },
};
/**
 * Returns plan limits for a given planId.
 * DB is always consulted first; hardcoded PLAN_LIMITS is a last-resort fallback.
 * Intentionally does NOT filter by isActive — existing subscribers on a
 * deactivated plan must still be able to resolve their limits.
 */
function getPlanConfig(planId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const { AppDataSource } = yield Promise.resolve().then(() => __importStar(require('../database')));
            const { PlanConfigEntity } = yield Promise.resolve().then(() => __importStar(require('../entities/PlanConfig')));
            const repo = AppDataSource.getRepository(PlanConfigEntity);
            const config = yield repo.findOne({ where: { planId } });
            if (!config)
                return (_a = exports.PLAN_LIMITS[planId]) !== null && _a !== void 0 ? _a : exports.PLAN_LIMITS['trial'];
            return {
                name: config.name,
                description: config.description,
                price: config.price,
                maxDevices: config.maxDevices === -1 ? Infinity : config.maxDevices,
                maxGeofences: config.maxGeofences === -1 ? Infinity : config.maxGeofences,
                vpnFiltering: config.vpnFiltering,
                realTimeAlerts: config.realTimeAlerts,
                smartTv: config.smartTv,
                advancedReports: config.advancedReports,
                schoolDashboard: config.schoolDashboard,
                priceId: (_b = config.stripePriceId) !== null && _b !== void 0 ? _b : undefined,
                stripePriceIdAnnual: (_c = config.stripePriceIdAnnual) !== null && _c !== void 0 ? _c : undefined,
                contactSalesOnly: config.contactSalesOnly,
            };
        }
        catch (_e) {
            return (_d = exports.PLAN_LIMITS[planId]) !== null && _d !== void 0 ? _d : exports.PLAN_LIMITS['trial'];
        }
    });
}
/**
 * Seeds plan_config_entity from hardcoded defaults on first run.
 * No-op if rows already exist. After this, the admin portal owns the data.
 */
function seedPlanConfigs() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const { AppDataSource } = yield Promise.resolve().then(() => __importStar(require('../database')));
            const { PlanConfigEntity } = yield Promise.resolve().then(() => __importStar(require('../entities/PlanConfig')));
            const repo = AppDataSource.getRepository(PlanConfigEntity);
            const existing = yield repo.count();
            if (existing > 0)
                return;
            for (const [planId, plan] of Object.entries(exports.PLAN_LIMITS)) {
                yield repo.save(repo.create({
                    planId,
                    name: plan.name,
                    description: plan.description,
                    price: (_a = plan.price) !== null && _a !== void 0 ? _a : null,
                    maxDevices: plan.maxDevices === Infinity ? -1 : plan.maxDevices,
                    maxGeofences: plan.maxGeofences === Infinity ? -1 : plan.maxGeofences,
                    vpnFiltering: plan.vpnFiltering,
                    realTimeAlerts: plan.realTimeAlerts,
                    smartTv: plan.smartTv,
                    advancedReports: plan.advancedReports,
                    schoolDashboard: plan.schoolDashboard,
                    stripePriceId: (_b = plan.priceId) !== null && _b !== void 0 ? _b : null,
                    stripePriceIdAnnual: (_c = plan.stripePriceIdAnnual) !== null && _c !== void 0 ? _c : null,
                    contactSalesOnly: (_d = plan.contactSalesOnly) !== null && _d !== void 0 ? _d : false,
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
 * Returns all active, non-trial plans from the DB for the public pricing page.
 * Falls back to hardcoded defaults if DB is unavailable.
 */
function getPlansForClientFromDb() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { AppDataSource } = yield Promise.resolve().then(() => __importStar(require('../database')));
            const { PlanConfigEntity } = yield Promise.resolve().then(() => __importStar(require('../entities/PlanConfig')));
            const repo = AppDataSource.getRepository(PlanConfigEntity);
            const configs = yield repo.find({
                where: { isActive: true },
                order: { createdAt: 'ASC' },
            });
            return configs
                .filter(c => c.planId !== 'trial')
                .map(c => ({
                id: c.planId,
                name: c.name,
                description: c.description,
                price: c.price,
                contactSalesOnly: c.contactSalesOnly,
                features: {
                    maxDevices: c.maxDevices,
                    maxGeofences: c.maxGeofences,
                    vpnFiltering: c.vpnFiltering,
                    realTimeAlerts: c.realTimeAlerts,
                    smartTv: c.smartTv,
                    advancedReports: c.advancedReports,
                    schoolDashboard: c.schoolDashboard,
                },
                priceId: c.stripePriceId || null,
                priceIdAnnual: c.stripePriceIdAnnual || null,
            }));
        }
        catch (_a) {
            return getPlansForClient();
        }
    });
}
/** Hardcoded fallback for getPlansForClientFromDb when DB is unreachable. */
function getPlansForClient() {
    return Object.entries(exports.PLAN_LIMITS)
        .filter(([id]) => id !== 'trial')
        .map(([id, plan]) => {
        var _a;
        return ({
            id,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            contactSalesOnly: (_a = plan.contactSalesOnly) !== null && _a !== void 0 ? _a : false,
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
            priceIdAnnual: plan.stripePriceIdAnnual || null,
        });
    });
}
//# sourceMappingURL=plans.js.map