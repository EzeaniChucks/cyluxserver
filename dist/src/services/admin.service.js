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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminService = exports.AdminService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../database");
const Admin_1 = require("../entities/Admin");
const Parent_1 = require("../entities/Parent");
const Subscription_1 = require("../entities/Subscription");
const PlanConfig_1 = require("../entities/PlanConfig");
const Referral_1 = require("../entities/Referral");
const plans_1 = require("../config/plans");
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
const ADMIN_JWT_REFRESH_SECRET = process.env.ADMIN_JWT_REFRESH_SECRET || process.env.ADMIN_JWT_SECRET;
const adminRepo = () => database_1.AppDataSource.getRepository(Admin_1.AdminEntity);
const parentRepo = () => database_1.AppDataSource.getRepository(Parent_1.ParentEntity);
const subRepo = () => database_1.AppDataSource.getRepository(Subscription_1.SubscriptionEntity);
const planConfigRepo = () => database_1.AppDataSource.getRepository(PlanConfig_1.PlanConfigEntity);
const referralRepo = () => database_1.AppDataSource.getRepository(Referral_1.ReferralEntity);
class AdminService {
    // ─── Auth ─────────────────────────────────────────────────────────────────
    seedFirstAdmin(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = yield adminRepo().count();
            if (existing > 0)
                throw new Error('Admin already seeded');
            const passwordHash = yield bcryptjs_1.default.hash(data.password, 12);
            const admin = adminRepo().create(Object.assign(Object.assign({}, data), { passwordHash, role: 'superadmin' }));
            return adminRepo().save(admin);
        });
    }
    login(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!ADMIN_JWT_SECRET)
                throw new Error('ADMIN_JWT_SECRET not configured');
            const admin = yield adminRepo().findOne({ where: { email: email.toLowerCase().trim() } });
            if (!admin || !admin.isActive)
                throw new Error('Invalid credentials');
            const valid = yield bcryptjs_1.default.compare(password, admin.passwordHash);
            if (!valid)
                throw new Error('Invalid credentials');
            admin.lastLoginAt = new Date();
            yield adminRepo().save(admin);
            const token = jsonwebtoken_1.default.sign({ id: admin.id, role: admin.role }, ADMIN_JWT_SECRET, { expiresIn: '8h' });
            return { token, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } };
        });
    }
    // ─── Stats ────────────────────────────────────────────────────────────────
    getPlatformStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const totalParents = yield parentRepo().count();
            const totalSubs = yield subRepo().count();
            const activeSubs = yield subRepo().count({ where: { status: 'active' } });
            const trialingSubs = yield subRepo().count({ where: { status: 'trialing' } });
            const totalReferrals = yield referralRepo().count();
            const totalConversions = yield referralRepo().count({ where: { status: 'subscribed' } });
            // MRR from active subscriptions grouped by plan
            const activeSubsByPlan = yield subRepo()
                .createQueryBuilder('sub')
                .select('sub.plan', 'plan')
                .addSelect('COUNT(*)', 'count')
                .where('sub.status = :status', { status: 'active' })
                .groupBy('sub.plan')
                .getRawMany();
            let mrr = 0;
            const subsByPlan = {};
            for (const row of activeSubsByPlan) {
                const count = parseInt(row.count, 10);
                subsByPlan[row.plan] = count;
                const planConfig = plans_1.PLAN_LIMITS[row.plan];
                if (planConfig === null || planConfig === void 0 ? void 0 : planConfig.price)
                    mrr += planConfig.price * count;
            }
            const conversionRate = totalParents > 0 ? ((activeSubs / totalParents) * 100).toFixed(1) : '0.0';
            // Recent signups (last 30 days)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const recentSignups = yield parentRepo()
                .createQueryBuilder('p')
                .select(['p.id', 'p.name', 'p.email'])
                .addSelect('sub.plan', 'plan')
                .addSelect('sub.status', 'subStatus')
                .addSelect('sub.createdAt', 'joinedAt')
                .leftJoin('p.subscription', 'sub')
                .where('sub.createdAt >= :from', { from: thirtyDaysAgo })
                .orderBy('sub.createdAt', 'DESC')
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
        });
    }
    // ─── Parents ──────────────────────────────────────────────────────────────
    getParents(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = opts.page || 1;
            const limit = Math.min(opts.limit || 20, 100);
            const skip = (page - 1) * limit;
            const qb = parentRepo()
                .createQueryBuilder('p')
                .leftJoinAndSelect('p.subscription', 'sub')
                .skip(skip)
                .take(limit)
                .orderBy('sub.createdAt', 'DESC');
            if (opts.search) {
                qb.where('(LOWER(p.email) LIKE :s OR LOWER(p.name) LIKE :s)', { s: `%${opts.search.toLowerCase()}%` });
            }
            if (opts.plan)
                qb.andWhere('sub.plan = :plan', { plan: opts.plan });
            if (opts.status)
                qb.andWhere('sub.status = :status', { status: opts.status });
            const [items, total] = yield qb.getManyAndCount();
            return { items, total, page, limit, pages: Math.ceil(total / limit) };
        });
    }
    getParentById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return parentRepo().findOne({
                where: { id },
                relations: ['subscription', 'children'],
            });
        });
    }
    updateParent(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const parent = yield parentRepo().findOne({ where: { id } });
            if (!parent)
                throw new Error('Parent not found');
            if (data.name)
                parent.name = data.name;
            if (data.email)
                parent.email = data.email.toLowerCase().trim();
            return parentRepo().save(parent);
        });
    }
    overrideSubscription(parentId, data, adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sub = yield subRepo().findOne({ where: { parentId } });
            if (!sub)
                throw new Error('Subscription not found');
            if (data.plan)
                sub.plan = data.plan;
            if (data.status)
                sub.status = data.status;
            if (data.trialExtendDays) {
                const base = sub.trialEndsAt && sub.trialEndsAt > new Date() ? sub.trialEndsAt : new Date();
                sub.trialEndsAt = new Date(base.getTime() + data.trialExtendDays * 24 * 60 * 60 * 1000);
                sub.status = 'trialing';
            }
            return subRepo().save(sub);
        });
    }
    deleteParent(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const parent = yield parentRepo().findOne({ where: { id } });
            if (!parent)
                throw new Error('Parent not found');
            yield parentRepo().remove(parent);
        });
    }
    // ─── Subscriptions ────────────────────────────────────────────────────────
    getSubscriptions(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = opts.page || 1;
            const limit = Math.min(opts.limit || 20, 100);
            const skip = (page - 1) * limit;
            const qb = subRepo()
                .createQueryBuilder('sub')
                .leftJoin('sub.parent', 'p')
                .addSelect(['p.id', 'p.name', 'p.email'])
                .skip(skip)
                .take(limit)
                .orderBy('sub.createdAt', 'DESC');
            if (opts.plan)
                qb.where('sub.plan = :plan', { plan: opts.plan });
            if (opts.status)
                qb.andWhere('sub.status = :status', { status: opts.status });
            const [items, total] = yield qb.getManyAndCount();
            return { items, total, page, limit, pages: Math.ceil(total / limit) };
        });
    }
    // ─── Plan Configs ─────────────────────────────────────────────────────────
    getPlanConfigs() {
        return __awaiter(this, void 0, void 0, function* () {
            return planConfigRepo().find({ order: { planId: 'ASC' } });
        });
    }
    updatePlanConfig(planId, data, adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            let config = yield planConfigRepo().findOne({ where: { planId } });
            if (!config)
                throw new Error('Plan config not found');
            Object.assign(config, data, { updatedByAdminId: adminId });
            return planConfigRepo().save(config);
        });
    }
    // ─── Revenue ──────────────────────────────────────────────────────────────
    getRevenue() {
        return __awaiter(this, void 0, void 0, function* () {
            const activeSubsByPlan = yield subRepo()
                .createQueryBuilder('sub')
                .select('sub.plan', 'plan')
                .addSelect('COUNT(*)', 'count')
                .where('sub.status = :status', { status: 'active' })
                .groupBy('sub.plan')
                .getRawMany();
            const byPlan = activeSubsByPlan.map(row => {
                var _a;
                const count = parseInt(row.count, 10);
                const price = ((_a = plans_1.PLAN_LIMITS[row.plan]) === null || _a === void 0 ? void 0 : _a.price) || 0;
                return { plan: row.plan, count, price, mrr: parseFloat((price * count).toFixed(2)) };
            });
            const totalMrr = byPlan.reduce((sum, p) => sum + p.mrr, 0);
            return { totalMrr: parseFloat(totalMrr.toFixed(2)), byPlan };
        });
    }
}
exports.AdminService = AdminService;
exports.adminService = new AdminService();
//# sourceMappingURL=admin.service.js.map