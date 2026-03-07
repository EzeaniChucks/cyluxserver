import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../database";
import { AdminEntity, AdminRole } from "../entities/Admin";
import { ParentEntity } from "../entities/Parent";
import { SubscriptionEntity } from "../entities/Subscription";
import { PlanConfigEntity } from "../entities/PlanConfig";
import { ReferralEntity } from "../entities/Referral";
import { PlanId } from "../config/plans";

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
const ADMIN_JWT_REFRESH_SECRET =
  process.env.ADMIN_JWT_REFRESH_SECRET || process.env.ADMIN_JWT_SECRET;

const adminRepo = () => AppDataSource.getRepository(AdminEntity);
const parentRepo = () => AppDataSource.getRepository(ParentEntity);
const subRepo = () => AppDataSource.getRepository(SubscriptionEntity);
const planConfigRepo = () => AppDataSource.getRepository(PlanConfigEntity);
const referralRepo = () => AppDataSource.getRepository(ReferralEntity);

export class AdminService {
  // ─── Auth ─────────────────────────────────────────────────────────────────

  async seedFirstAdmin(data: {
    email: string;
    password: string;
    name: string;
  }) {
    const existing = await adminRepo().count();
    if (existing > 0) throw new Error("Admin already seeded");
    const passwordHash = await bcrypt.hash(data.password, 12);
    const admin = adminRepo().create({
      ...data,
      passwordHash,
      role: "superadmin",
    });
    return adminRepo().save(admin);
  }

  async login(email: string, password: string) {
    if (!ADMIN_JWT_SECRET) throw new Error("ADMIN_JWT_SECRET not configured");
    const admin = await adminRepo().findOne({
      where: { email: email.toLowerCase().trim() },
    });
    if (!admin || !admin.isActive) throw new Error("Invalid credentials");
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new Error("Invalid credentials");
    admin.lastLoginAt = new Date();
    await adminRepo().save(admin);
    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      ADMIN_JWT_SECRET,
      { expiresIn: "8h" }
    );
    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getPlatformStats() {
    const totalParents = await parentRepo().count();
    const totalSubs = await subRepo().count();
    const activeSubs = await subRepo().count({ where: { status: "active" } });
    const trialingSubs = await subRepo().count({
      where: { status: "trialing" },
    });
    const totalReferrals = await referralRepo().count();
    const totalConversions = await referralRepo().count({
      where: { status: "subscribed" },
    });

    // MRR from active subscriptions grouped by plan
    const activeSubsByPlan = await subRepo()
      .createQueryBuilder("sub")
      .select("sub.plan", "plan")
      .addSelect("COUNT(*)", "count")
      .where("sub.status = :status", { status: "active" })
      .groupBy("sub.plan")
      .getRawMany();

    // Load all plan configs once to avoid N+1 queries
    const allPlanConfigs = await planConfigRepo().find();
    const configByPlan = new Map(allPlanConfigs.map((c) => [c.planId, c]));

    let mrr = 0;
    const subsByPlan: Record<string, number> = {};
    for (const row of activeSubsByPlan) {
      const count = parseInt(row.count, 10);
      subsByPlan[row.plan] = count;
      const planConfig = configByPlan.get(row.plan);
      if (planConfig?.price) mrr += planConfig.price * count;
    }

    const conversionRate =
      totalParents > 0 ? ((activeSubs / totalParents) * 100).toFixed(1) : "0.0";

    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSignups = await parentRepo()
      .createQueryBuilder("p")
      .select(["p.id", "p.name", "p.email"])
      .addSelect("sub.plan", "plan")
      .addSelect("sub.status", "subStatus")
      .addSelect("sub.createdAt", "joinedAt")
      .leftJoin("p.subscription", "sub")
      .where("sub.createdAt >= :from", { from: thirtyDaysAgo })
      .orderBy("sub.createdAt", "DESC")
      .limit(20)
      .getRawMany();

    return {
      totalParents,
      totalSubs,
      activeSubs,
      trialingSubs,
      subsByPlan,
      mrr: parseFloat(mrr.toFixed(2)),
      conversionRate,
      totalReferrals,
      totalConversions,
      recentSignups,
    };
  }

  // ─── Parents ──────────────────────────────────────────────────────────────

  async getParents(opts: {
    page?: number;
    limit?: number;
    search?: string;
    plan?: string;
    status?: string;
  }) {
    const page = opts.page || 1;
    const limit = Math.min(opts.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = parentRepo()
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.subscription", "sub")
      .skip(skip)
      .take(limit)
      .orderBy("sub.createdAt", "DESC");

    if (opts.search) {
      qb.where("(LOWER(p.email) LIKE :s OR LOWER(p.name) LIKE :s)", {
        s: `%${opts.search.toLowerCase()}%`,
      });
    }
    if (opts.plan) qb.andWhere("sub.plan = :plan", { plan: opts.plan });
    if (opts.status)
      qb.andWhere("sub.status = :status", { status: opts.status });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getParentById(id: string) {
    return parentRepo().findOne({
      where: { id },
      relations: ["subscription", "children"],
    });
  }

  async updateParent(id: string, data: { name?: string; email?: string }) {
    const parent = await parentRepo().findOne({ where: { id } });
    if (!parent) throw new Error("Parent not found");
    if (data.name) parent.name = data.name;
    if (data.email) parent.email = data.email.toLowerCase().trim();
    return parentRepo().save(parent);
  }

  async overrideSubscription(
    parentId: string,
    data: { plan?: string; status?: string; trialExtendDays?: number },
    adminId: string
  ) {
    const sub = await subRepo().findOne({ where: { parentId } });
    if (!sub) throw new Error("Subscription not found");
    if (data.plan) sub.plan = data.plan as PlanId;
    if (data.status) sub.status = data.status;
    if (data.trialExtendDays) {
      const base =
        sub.trialEndsAt && sub.trialEndsAt > new Date()
          ? sub.trialEndsAt
          : new Date();
      sub.trialEndsAt = new Date(
        base.getTime() + data.trialExtendDays * 24 * 60 * 60 * 1000
      );
      sub.status = "trialing";
    }
    return subRepo().save(sub);
  }

  async deleteParent(id: string) {
    const parent = await parentRepo().findOne({ where: { id } });
    if (!parent) throw new Error("Parent not found");
    await parentRepo().remove(parent);
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────

  async getSubscriptions(opts: {
    page?: number;
    limit?: number;
    plan?: string;
    status?: string;
  }) {
    const page = opts.page || 1;
    const limit = Math.min(opts.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = subRepo()
      .createQueryBuilder("sub")
      .leftJoin("sub.parent", "p")
      .addSelect(["p.id", "p.name", "p.email"])
      .skip(skip)
      .take(limit)
      .orderBy("sub.createdAt", "DESC");

    if (opts.plan) qb.where("sub.plan = :plan", { plan: opts.plan });
    if (opts.status)
      qb.andWhere("sub.status = :status", { status: opts.status });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ─── Plan Configs ─────────────────────────────────────────────────────────

  async getPlanConfigs() {
    return planConfigRepo().find({ order: { planId: "ASC" } });
  }

  async updatePlanConfig(
    planId: string,
    data: Partial<PlanConfigEntity>,
    adminId: string
  ) {
    const config = await planConfigRepo().findOne({ where: { planId } });
    if (!config) throw new Error("Plan not found");
    // planId is immutable — strip it from the update payload
    const { planId: _ignored, ...safeData } = data as any;
    Object.assign(config, safeData, { updatedByAdminId: adminId });
    return planConfigRepo().save(config);
  }

  async createPlanConfig(
    data: {
      planId: string;
      name: string;
      description: string;
      price?: number | null;
      stripePriceId?: string | null;
      stripePriceIdAnnual?: string | null;
      contactSalesOnly?: boolean;
      maxDevices: number;
      maxGeofences: number;
      vpnFiltering: boolean;
      realTimeAlerts: boolean;
      smartTv: boolean;
      advancedReports: boolean;
      schoolDashboard: boolean;
      trialDays?: number;
    },
    adminId: string
  ) {
    if (!/^[a-z0-9_]+$/.test(data.planId)) {
      throw new Error(
        "planId must contain only lowercase letters, numbers, and underscores"
      );
    }
    if (data.planId === "trial") {
      throw new Error("'trial' is a reserved plan ID");
    }
    const existing = await planConfigRepo().findOne({
      where: { planId: data.planId },
    });
    if (existing)
      throw new Error(`A plan with ID '${data.planId}' already exists`);

    const config = planConfigRepo().create({
      ...data,
      price: data.price ?? null,
      stripePriceId: data.stripePriceId ?? null,
      stripePriceIdAnnual: data.stripePriceIdAnnual ?? null,
      contactSalesOnly: data.contactSalesOnly ?? false,
      trialDays: data.trialDays ?? 0,
      isActive: true,
      updatedByAdminId: adminId,
    });
    return planConfigRepo().save(config);
  }

  /**
   * Soft-deletes a plan by setting isActive = false.
   * Blocked if any subscribers are currently active on the plan.
   * Hard-deletes are never allowed — existing subscription rows reference the plan slug.
   */
  async deactivatePlanConfig(planId: string, adminId: string) {
    if (planId === "trial")
      throw new Error("The 'trial' plan cannot be deactivated");

    const config = await planConfigRepo().findOne({ where: { planId } });
    if (!config) throw new Error("Plan not found");
    if (!config.isActive) throw new Error("Plan is already inactive");

    const activeCount = await subRepo()
      .createQueryBuilder("sub")
      .where("sub.plan = :planId", { planId })
      .andWhere("sub.status IN (:...statuses)", {
        statuses: ["active", "past_due", "trialing"],
      })
      .getCount();

    if (activeCount > 0) {
      throw new Error(
        `Cannot deactivate: ${activeCount} subscriber(s) are currently on this plan. ` +
          `Migrate them to another plan first via the subscriptions panel.`
      );
    }

    config.isActive = false;
    config.updatedByAdminId = adminId;
    return planConfigRepo().save(config);
  }

  // ─── Revenue ──────────────────────────────────────────────────────────────

  async getRevenue() {
    const activeSubsByPlan = await subRepo()
      .createQueryBuilder("sub")
      .select("sub.plan", "plan")
      .addSelect("COUNT(*)", "count")
      .where("sub.status = :status", { status: "active" })
      .groupBy("sub.plan")
      .getRawMany();

    const allConfigs = await planConfigRepo().find();
    const configMap = new Map(allConfigs.map((c) => [c.planId, c]));

    const byPlan = activeSubsByPlan.map((row) => {
      const count = parseInt(row.count, 10);
      const price = configMap.get(row.plan)?.price || 0;
      return {
        plan: row.plan,
        count,
        price,
        mrr: parseFloat((price * count).toFixed(2)),
      };
    });

    const totalMrr = byPlan.reduce((sum, p) => sum + p.mrr, 0);

    return { totalMrr: parseFloat(totalMrr.toFixed(2)), byPlan };
  }
}

export const adminService = new AdminService();
