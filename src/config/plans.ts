/**
 * Plan identifier. Previously a strict union type; now a free string slug
 * so admins can create plans with any name. 'trial' is reserved and
 * managed server-side (no Stripe price).
 */
export type PlanId = string;

export interface PlanLimits {
  name: string;
  description: string;
  /** Monthly USD price. undefined/null for contact-sales plans. */
  price?: number | null;
  maxDevices: number;
  maxGeofences: number;
  vpnFiltering: boolean;
  realTimeAlerts: boolean;
  /** Read WhatsApp, Instagram, Snapchat etc. notifications. */
  notificationMonitoring: boolean;
  /** See every call made and received on the child's device. */
  callMonitoring: boolean;
  /** Read SMS/text messages sent and received. */
  smsMonitoring: boolean;
  smartTv: boolean;
  advancedReports: boolean;
  schoolDashboard: boolean;
  /** Stripe Price ID for monthly billing. */
  priceId?: string;
  /** Stripe Price ID for annual billing. */
  stripePriceIdAnnual?: string;
  /** When true, no self-serve checkout — admin handles billing. */
  contactSalesOnly?: boolean;
}

/**
 * Hardcoded defaults — used only for first-boot seeding and as a
 * last-resort fallback when the DB is unreachable.
 * Source of truth after first boot is plan_config_entity in the DB.
 */
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  trial: {
    name: 'Free Trial',
    description: '7-day Premium trial — no credit card required',
    price: 0,
    maxDevices: 3,
    maxGeofences: 5,
    vpnFiltering: true,
    realTimeAlerts: true,
    notificationMonitoring: true,
    callMonitoring: true,
    smsMonitoring: true,
    smartTv: false,
    advancedReports: false,
    schoolDashboard: false,
  },
  basic: {
    name: 'Basic',
    description: 'Essential protection for one child',
    price: 4.99,
    maxDevices: 1,
    maxGeofences: 1,
    vpnFiltering: true,
    realTimeAlerts: true,
    notificationMonitoring: false,
    callMonitoring: false,
    smsMonitoring: false,
    smartTv: false,
    advancedReports: false,
    schoolDashboard: false,
    priceId: process.env.STRIPE_PRICE_BASIC_MONTHLY,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_BASIC_ANNUAL,
  },
  premium: {
    name: 'Premium',
    description: 'Full visibility — calls, texts & social notifications',
    price: 10.99,
    maxDevices: 3,
    maxGeofences: 5,
    vpnFiltering: true,
    realTimeAlerts: true,
    notificationMonitoring: true,
    callMonitoring: true,
    smsMonitoring: true,
    smartTv: false,
    advancedReports: false,
    schoolDashboard: false,
    priceId: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
  },
  premium_plus: {
    name: 'Premium Plus',
    description: 'Everything in Premium + Smart TV & unlimited geofences',
    price: 14.99,
    maxDevices: 5,
    maxGeofences: Infinity,
    vpnFiltering: true,
    realTimeAlerts: true,
    notificationMonitoring: true,
    callMonitoring: true,
    smsMonitoring: true,
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
    notificationMonitoring: true,
    callMonitoring: true,
    smsMonitoring: true,
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
export async function getPlanConfig(planId: string): Promise<PlanLimits> {
  try {
    const { AppDataSource } = await import('../database');
    const { PlanConfigEntity } = await import('../entities/PlanConfig');
    const repo = AppDataSource.getRepository(PlanConfigEntity);
    const config = await repo.findOne({ where: { planId } });
    if (!config) return PLAN_LIMITS[planId] ?? PLAN_LIMITS['trial'];

    return {
      name: config.name,
      description: config.description,
      price: config.price,
      maxDevices: config.maxDevices === -1 ? Infinity : config.maxDevices,
      maxGeofences: config.maxGeofences === -1 ? Infinity : config.maxGeofences,
      vpnFiltering: config.vpnFiltering,
      realTimeAlerts: config.realTimeAlerts,
      notificationMonitoring: config.notificationMonitoring,
      callMonitoring: config.callMonitoring,
      smsMonitoring: config.smsMonitoring,
      smartTv: config.smartTv,
      advancedReports: config.advancedReports,
      schoolDashboard: config.schoolDashboard,
      priceId: config.stripePriceId ?? undefined,
      stripePriceIdAnnual: config.stripePriceIdAnnual ?? undefined,
      contactSalesOnly: config.contactSalesOnly,
    };
  } catch {
    return PLAN_LIMITS[planId] ?? PLAN_LIMITS['trial'];
  }
}

/**
 * Seeds plan_config_entity from hardcoded defaults on first run.
 * No-op if rows already exist. After this, the admin portal owns the data.
 */
export async function seedPlanConfigs(): Promise<void> {
  try {
    const { AppDataSource } = await import('../database');
    const { PlanConfigEntity } = await import('../entities/PlanConfig');
    const repo = AppDataSource.getRepository(PlanConfigEntity);
    const existing = await repo.count();
    if (existing > 0) return;

    for (const [planId, plan] of Object.entries(PLAN_LIMITS)) {
      await repo.save(
        repo.create({
          planId,
          name: plan.name,
          description: plan.description,
          price: plan.price ?? null,
          maxDevices: plan.maxDevices === Infinity ? -1 : plan.maxDevices,
          maxGeofences: plan.maxGeofences === Infinity ? -1 : plan.maxGeofences,
          vpnFiltering: plan.vpnFiltering,
          realTimeAlerts: plan.realTimeAlerts,
          notificationMonitoring: plan.notificationMonitoring,
          callMonitoring: plan.callMonitoring,
          smsMonitoring: plan.smsMonitoring,
          smartTv: plan.smartTv,
          advancedReports: plan.advancedReports,
          schoolDashboard: plan.schoolDashboard,
          stripePriceId: plan.priceId ?? null,
          stripePriceIdAnnual: plan.stripePriceIdAnnual ?? null,
          contactSalesOnly: plan.contactSalesOnly ?? false,
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
 * Returns all active, non-trial plans from the DB for the public pricing page.
 * Falls back to hardcoded defaults if DB is unavailable.
 */
export async function getPlansForClientFromDb() {
  try {
    const { AppDataSource } = await import('../database');
    const { PlanConfigEntity } = await import('../entities/PlanConfig');
    const repo = AppDataSource.getRepository(PlanConfigEntity);
    const configs = await repo.find({
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
          notificationMonitoring: c.notificationMonitoring,
          callMonitoring: c.callMonitoring,
          smsMonitoring: c.smsMonitoring,
          smartTv: c.smartTv,
          advancedReports: c.advancedReports,
          schoolDashboard: c.schoolDashboard,
        },
        priceId: c.stripePriceId || null,
        priceIdAnnual: c.stripePriceIdAnnual || null,
      }));
  } catch {
    return getPlansForClient();
  }
}

/** Hardcoded fallback for getPlansForClientFromDb when DB is unreachable. */
export function getPlansForClient() {
  return Object.entries(PLAN_LIMITS)
    .filter(([id]) => id !== 'trial')
    .map(([id, plan]) => ({
      id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      contactSalesOnly: plan.contactSalesOnly ?? false,
      features: {
        maxDevices: plan.maxDevices === Infinity ? -1 : plan.maxDevices,
        maxGeofences: plan.maxGeofences === Infinity ? -1 : plan.maxGeofences,
        vpnFiltering: plan.vpnFiltering,
        realTimeAlerts: plan.realTimeAlerts,
        notificationMonitoring: plan.notificationMonitoring,
        callMonitoring: plan.callMonitoring,
        smsMonitoring: plan.smsMonitoring,
        smartTv: plan.smartTv,
        advancedReports: plan.advancedReports,
        schoolDashboard: plan.schoolDashboard,
      },
      priceId: plan.priceId || null,
      priceIdAnnual: plan.stripePriceIdAnnual || null,
    }));
}
