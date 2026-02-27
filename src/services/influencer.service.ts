import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { AppDataSource } from '../database';
import { InfluencerEntity } from '../entities/Influencer';
import { ReferralEntity } from '../entities/Referral';
import { ParentEntity } from '../entities/Parent';
import { SubscriptionEntity } from '../entities/Subscription';
import { PlanId, PLAN_LIMITS } from '../config/plans';

const INFLUENCER_JWT_SECRET = process.env.INFLUENCER_JWT_SECRET;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20' as any,
});

const influencerRepo = () => AppDataSource.getRepository(InfluencerEntity);
const referralRepo = () => AppDataSource.getRepository(ReferralEntity);
const parentRepo = () => AppDataSource.getRepository(ParentEntity);
const subRepo = () => AppDataSource.getRepository(SubscriptionEntity);

export class InfluencerService {
  // ─── Auth ─────────────────────────────────────────────────────────────────

  async login(email: string, password: string) {
    if (!INFLUENCER_JWT_SECRET) throw new Error('INFLUENCER_JWT_SECRET not configured');
    const influencer = await influencerRepo().findOne({ where: { email: email.toLowerCase().trim() } });
    if (!influencer || !influencer.isActive) throw new Error('Invalid credentials');
    const valid = await bcrypt.compare(password, influencer.passwordHash);
    if (!valid) throw new Error('Invalid credentials');
    const token = jwt.sign({ id: influencer.id }, INFLUENCER_JWT_SECRET, { expiresIn: '7d' });
    return {
      token,
      influencer: {
        id: influencer.id,
        email: influencer.email,
        name: influencer.name,
        code: influencer.code,
        discountPercent: influencer.discountPercent,
      },
    };
  }

  // ─── Code Validation ──────────────────────────────────────────────────────

  async validateCode(code: string) {
    const influencer = await influencerRepo().findOne({ where: { code: code.toUpperCase(), isActive: true } });
    if (!influencer) return null;
    return {
      valid: true,
      discountPercent: influencer.discountPercent,
      influencerName: influencer.name,
      influencerId: influencer.id,
    };
  }

  // ─── Stripe Coupon ────────────────────────────────────────────────────────

  /**
   * Returns the Stripe coupon ID for a given influencer code.
   * Lazily creates the coupon in Stripe on first use and caches it.
   */
  async getOrCreateStripeCoupon(code: string): Promise<string | null> {
    const influencer = await influencerRepo().findOne({ where: { code: code.toUpperCase(), isActive: true } });
    if (!influencer) return null;

    if (influencer.stripeCouponId) return influencer.stripeCouponId;

    // Create a once-use coupon in Stripe
    const coupon = await stripe.coupons.create({
      percent_off: influencer.discountPercent,
      duration: 'once',
      name: `${influencer.discountPercent}% off — ${influencer.code}`,
      metadata: { influencerCode: influencer.code, influencerId: influencer.id },
    });

    influencer.stripeCouponId = coupon.id;
    await influencerRepo().save(influencer);
    return coupon.id;
  }

  // ─── Referral Tracking ────────────────────────────────────────────────────

  async recordRegistration(code: string, parentId: string): Promise<void> {
    const influencer = await influencerRepo().findOne({ where: { code: code.toUpperCase(), isActive: true } });
    if (!influencer) return;

    // Avoid duplicate referral records
    const existing = await referralRepo().findOne({ where: { influencerId: influencer.id, referredParentId: parentId } });
    if (existing) return;

    await referralRepo().save(
      referralRepo().create({
        influencerId: influencer.id,
        referredParentId: parentId,
        status: 'registered',
        discountPercent: influencer.discountPercent,
      }),
    );

    influencer.totalReferrals += 1;
    await influencerRepo().save(influencer);
  }

  async recordConversion(parentId: string, plan: string, amountCents: number): Promise<void> {
    const referral = await referralRepo().findOne({
      where: { referredParentId: parentId, status: 'registered' },
      relations: ['influencer'],
    });
    if (!referral) return;

    const influencer = referral.influencer;
    let rewardAmount = 0;
    if (influencer.rewardType === 'percentage' && influencer.rewardValue) {
      rewardAmount = (amountCents / 100) * (influencer.rewardValue / 100);
    } else if (influencer.rewardType === 'fixed' && influencer.rewardValue) {
      rewardAmount = influencer.rewardValue;
    } else if (influencer.rewardType === 'credit' && influencer.rewardValue) {
      rewardAmount = influencer.rewardValue;
    }

    referral.status = 'subscribed';
    referral.plan = plan;
    referral.firstPaymentAmountCents = amountCents;
    referral.rewardAmount = parseFloat(rewardAmount.toFixed(2));
    referral.rewardType = influencer.rewardType;
    await referralRepo().save(referral);

    influencer.totalConversions += 1;
    influencer.totalEarningsUsd = parseFloat((influencer.totalEarningsUsd + rewardAmount).toFixed(2));
    await influencerRepo().save(influencer);

    // Credit influencer's wallet — held for fraud buffer, then withdrawable
    if (rewardAmount > 0) {
      try {
        const { walletService } = await import('./wallet.service');
        await walletService.credit(
          influencer.id,
          'influencer',
          rewardAmount,
          `Commission — ${plan} subscription (${influencer.rewardType})`,
          referral.id,
        );
      } catch { }
    }
  }

  // ─── CRUD (by admin) ──────────────────────────────────────────────────────

  async createInfluencer(data: {
    name: string;
    email: string;
    password: string;
    code: string;
    discountPercent?: number;
    rewardType?: string;
    rewardValue?: number;
  }) {
    const existingEmail = await influencerRepo().findOne({ where: { email: data.email.toLowerCase() } });
    if (existingEmail) throw new Error('Email already in use');
    const existingCode = await influencerRepo().findOne({ where: { code: data.code.toUpperCase() } });
    if (existingCode) throw new Error('Referral code already taken');
    const passwordHash = await bcrypt.hash(data.password, 12);
    const influencer = influencerRepo().create({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      code: data.code.toUpperCase(),
      discountPercent: data.discountPercent ?? 20,
      rewardType: (data.rewardType as any) ?? null,
      rewardValue: data.rewardValue ?? null,
    });
    return influencerRepo().save(influencer);
  }

  async getInfluencers() {
    return influencerRepo().find({ order: { createdAt: 'DESC' } });
  }

  async getInfluencerById(id: string) {
    return influencerRepo().findOne({ where: { id }, relations: ['referrals'] });
  }

  async updateInfluencer(id: string, data: Partial<Pick<InfluencerEntity, 'name' | 'discountPercent' | 'rewardType' | 'rewardValue' | 'isActive'>>) {
    const influencer = await influencerRepo().findOne({ where: { id } });
    if (!influencer) throw new Error('Influencer not found');
    Object.assign(influencer, data);
    // If discountPercent changed, invalidate cached coupon so it'll be recreated
    if (data.discountPercent !== undefined && data.discountPercent !== influencer.discountPercent) {
      influencer.stripeCouponId = null;
    }
    return influencerRepo().save(influencer);
  }

  async deactivateInfluencer(id: string) {
    const influencer = await influencerRepo().findOne({ where: { id } });
    if (!influencer) throw new Error('Influencer not found');
    influencer.isActive = false;
    return influencerRepo().save(influencer);
  }

  async getReferrals(influencerId: string) {
    return referralRepo().find({
      where: { influencerId },
      order: { createdAt: 'DESC' },
      relations: ['referredParent'],
    });
  }

  async markRewardPaid(referralId: string) {
    const referral = await referralRepo().findOne({ where: { id: referralId } });
    if (!referral) throw new Error('Referral not found');
    referral.status = 'reward_paid';
    referral.rewardPaidAt = new Date();
    return referralRepo().save(referral);
  }

  // ─── Dashboard (for influencer self-serve) ────────────────────────────────

  async getDashboard(influencerId: string) {
    const influencer = await influencerRepo().findOne({ where: { id: influencerId } });
    if (!influencer) throw new Error('Influencer not found');
    return {
      code: influencer.code,
      discountPercent: influencer.discountPercent,
      totalReferrals: influencer.totalReferrals,
      totalConversions: influencer.totalConversions,
      totalEarningsUsd: influencer.totalEarningsUsd,
      rewardType: influencer.rewardType,
      rewardValue: influencer.rewardValue,
    };
  }

  async updateProfile(influencerId: string, data: { name?: string; password?: string }) {
    const influencer = await influencerRepo().findOne({ where: { id: influencerId } });
    if (!influencer) throw new Error('Influencer not found');
    if (data.name) influencer.name = data.name;
    if (data.password) {
      if (data.password.length < 8) throw new Error('Password must be at least 8 characters');
      influencer.passwordHash = await bcrypt.hash(data.password, 12);
    }
    return influencerRepo().save(influencer);
  }
}

export const influencerService = new InfluencerService();
