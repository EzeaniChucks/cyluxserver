export type PlanId = 'trial' | 'basic' | 'premium' | 'premium_plus' | 'enterprise';

export interface PlanLimits {
  maxDevices: number;
  maxGeofences: number;
  vpnFiltering: boolean;
  realTimeAlerts: boolean;
  smartTv: boolean;
  advancedReports: boolean;
  schoolDashboard: boolean;
  priceId?: string;
  price?: number;
  name: string;
  description: string;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
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
export async function getPlanConfig(planId: PlanId): Promise<PlanLimits> {
  try {
    const { AppDataSource } = await import('../database');
    const { PlanConfigEntity } = await import('../entities/PlanConfig');
    const repo = AppDataSource.getRepository(PlanConfigEntity);
    const config = await repo.findOne({ where: { planId, isActive: true } });
    if (!config) return PLAN_LIMITS[planId];

    return {
      name: config.name,
      description: config.description,
      price: config.price ?? PLAN_LIMITS[planId].price,
      maxDevices: config.maxDevices === -1 ? Infinity : config.maxDevices,
      maxGeofences: config.maxGeofences === -1 ? Infinity : config.maxGeofences,
      vpnFiltering: config.vpnFiltering,
      realTimeAlerts: config.realTimeAlerts,
      smartTv: config.smartTv,
      advancedReports: config.advancedReports,
      schoolDashboard: config.schoolDashboard,
      priceId: config.stripePriceId ?? PLAN_LIMITS[planId].priceId,
    };
  } catch {
    return PLAN_LIMITS[planId];
  }
}

/**
 * Seeds plan_config_entity from hardcoded defaults on first run.
 * No-op if rows already exist.
 */
export async function seedPlanConfigs(): Promise<void> {
  try {
    const { AppDataSource } = await import('../database');
    const { PlanConfigEntity } = await import('../entities/PlanConfig');
    const repo = AppDataSource.getRepository(PlanConfigEntity);
    const existing = await repo.count();
    if (existing > 0) return;

    const entries = Object.entries(PLAN_LIMITS) as [PlanId, PlanLimits][];
    for (const [planId, plan] of entries) {
      await repo.save(
        repo.create({
          planId,
          name: plan.name,
          description: plan.description,
          price: plan.price ?? 0,
          maxDevices: plan.maxDevices === Infinity ? -1 : plan.maxDevices,
          maxGeofences: plan.maxGeofences === Infinity ? -1 : plan.maxGeofences,
          vpnFiltering: plan.vpnFiltering,
          realTimeAlerts: plan.realTimeAlerts,
          smartTv: plan.smartTv,
          advancedReports: plan.advancedReports,
          schoolDashboard: plan.schoolDashboard,
          stripePriceId: plan.priceId ?? null,
          trialDays: planId === 'trial' ? 7 : 0,
        }),
      );
    }
    console.log('[Plans] Seeded plan configs from defaults');
  } catch (err: any) {
    console.error('[Plans] Failed to seed plan configs:', err.message);
  }
}

/**
 * Returns a serialisable version of plan configs from DB (with hardcoded fallback).
 * Replaces Infinity / -1 with -1 for JSON consistency.
 */
export async function getPlansForClientFromDb() {
  const planIds: PlanId[] = ['basic', 'premium', 'premium_plus', 'enterprise'];
  const results = await Promise.all(planIds.map(async id => {
    const plan = await getPlanConfig(id);
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
  }));
  return results;
}

/** Returns a serialisable version of PLAN_LIMITS (replaces Infinity with -1 for JSON). */
export function getPlansForClient() {
  return (Object.entries(PLAN_LIMITS) as [PlanId, PlanLimits][])
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
