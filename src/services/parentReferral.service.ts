import crypto from 'crypto';
import Stripe from 'stripe';
import { AppDataSource } from '../database';
import { ParentReferralEntity } from '../entities/ParentReferral';
import { ParentReferralConfigEntity, ParentRewardType } from '../entities/ParentReferralConfig';
import { ParentEntity } from '../entities/Parent';
import { SubscriptionEntity } from '../entities/Subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20' as any,
});

const referralRepo = () => AppDataSource.getRepository(ParentReferralEntity);
const configRepo = () => AppDataSource.getRepository(ParentReferralConfigEntity);
const parentRepo = () => AppDataSource.getRepository(ParentEntity);
const subRepo = () => AppDataSource.getRepository(SubscriptionEntity);

export class ParentReferralService {
  // ─── Config (singleton row) ───────────────────────────────────────────────

  async getConfig(): Promise<ParentReferralConfigEntity> {
    let config = await configRepo().findOne({ where: {} });
    if (!config) {
      config = await configRepo().save(configRepo().create({}));
    }
    return config;
  }

  async updateConfig(
    data: Partial<Pick<ParentReferralConfigEntity, 'isEnabled' | 'rewardType' | 'rewardValue' | 'referredDiscountPercent'>>,
    adminId: string,
  ): Promise<ParentReferralConfigEntity> {
    const config = await this.getConfig();
    Object.assign(config, data, { updatedByAdminId: adminId });
    return configRepo().save(config);
  }

  // ─── Code Management ──────────────────────────────────────────────────────

  /** Returns (or lazily creates) the parent's personal referral code. */
  async getOrCreateCode(parentId: string): Promise<string> {
    const parent = await parentRepo().findOne({ where: { id: parentId } });
    if (!parent) throw new Error('Parent not found');
    if (parent.ownReferralCode) return parent.ownReferralCode;

    // Generate a short unique code: first 4 letters of name + 4 random hex chars
    const prefix = (parent.name || 'USER')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4)
      .padEnd(4, 'X');
    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const code = `${prefix}${suffix}`;

    parent.ownReferralCode = code;
    await parentRepo().save(parent);
    return code;
  }

  /**
   * Validates a parent referral code.
   * Returns referrer info if valid and the program is enabled.
   */
  async validateCode(code: string): Promise<{ valid: boolean; referrerId?: string; discountPercent?: number } | null> {
    const config = await this.getConfig();
    if (!config.isEnabled) return { valid: false };

    const parent = await parentRepo().findOne({ where: { ownReferralCode: code.toUpperCase() } });
    if (!parent) return null;

    return {
      valid: true,
      referrerId: parent.id,
      discountPercent: config.referredDiscountPercent > 0 ? config.referredDiscountPercent : 0,
    };
  }

  // ─── Referral Tracking ────────────────────────────────────────────────────

  async recordRegistration(referrerId: string, newParentId: string): Promise<void> {
    // Prevent self-referral
    if (referrerId === newParentId) return;

    // Prevent duplicate
    const existing = await referralRepo().findOne({ where: { referrerId, referredId: newParentId } });
    if (existing) return;

    await referralRepo().save(
      referralRepo().create({
        referrerId,
        referredId: newParentId,
        status: 'registered',
      }),
    );
  }

  /**
   * Called when a referred parent's invoice.payment_succeeded fires.
   * Grants the configured reward to the referrer.
   */
  async processConversion(newParentId: string, plan: string, amountCents: number): Promise<void> {
    const referral = await referralRepo().findOne({
      where: { referredId: newParentId, status: 'registered' },
    });
    if (!referral) return;

    const config = await this.getConfig();
    if (!config.isEnabled) return;

    referral.plan = plan;
    referral.firstPaymentAmountCents = amountCents;
    referral.status = 'subscribed';
    referral.rewardType = config.rewardType;
    referral.rewardValue = config.rewardType !== 'none' ? config.rewardValue : null;
    await referralRepo().save(referral);

    // Grant reward immediately
    if (config.rewardType !== 'none' && config.rewardValue > 0) {
      await this.grantReward(referral.referrerId, config.rewardType, config.rewardValue, referral.id);
    }
  }

  private async grantReward(
    referrerId: string,
    rewardType: ParentRewardType,
    rewardValue: number,
    referralId: string,
  ): Promise<void> {
    try {
      const sub = await subRepo().findOne({ where: { parentId: referrerId } });
      if (!sub) return;

      if (rewardType === 'trial_extension_days') {
        const base =
          sub.status === 'trialing' && sub.trialEndsAt && sub.trialEndsAt > new Date()
            ? sub.trialEndsAt
            : sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()
            ? sub.currentPeriodEnd
            : new Date();

        const extended = new Date(base.getTime() + rewardValue * 24 * 60 * 60 * 1000);

        if (sub.status === 'trialing') {
          sub.trialEndsAt = extended;
        } else if (sub.status === 'active' || sub.status === 'past_due') {
          sub.currentPeriodEnd = extended;
        }
        await subRepo().save(sub);
      }

      if (rewardType === 'account_credit_usd') {
        // Credit the referrer's wallet — held for fraud buffer, then withdrawable
        try {
          const { walletService } = await import('./wallet.service');
          await walletService.credit(
            referrerId,
            'parent',
            rewardValue,
            `Referral reward — friend subscribed`,
            referralId,
          );
        } catch { }
      }

      // Mark reward granted
      await referralRepo().update(referralId, {
        status: 'reward_granted',
        rewardGrantedAt: new Date(),
      });
    } catch (err: any) {
      console.error('[ParentReferral] Failed to grant reward:', err.message);
    }
  }

  /** Returns the active (registered, not yet converted) referral for a given referred parent. */
  async getActiveReferralForParent(parentId: string): Promise<ParentReferralEntity | null> {
    return referralRepo().findOne({ where: { referredId: parentId, status: 'registered' } });
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getStats(parentId: string) {
    const code = await this.getOrCreateCode(parentId);
    const config = await this.getConfig();

    const referrals = await referralRepo().find({
      where: { referrerId: parentId },
      order: { createdAt: 'DESC' },
      relations: ['referred'],
      take: 50,
    });

    const totalReferrals = referrals.length;
    const conversions = referrals.filter(r => r.status !== 'registered').length;
    const rewardsGranted = referrals.filter(r => r.status === 'reward_granted').length;

    const history = referrals.map(r => ({
      id: r.id,
      status: r.status,
      plan: r.plan,
      rewardValue: r.rewardValue,
      rewardType: r.rewardType,
      rewardGrantedAt: r.rewardGrantedAt,
      createdAt: r.createdAt,
      referredEmail: r.referred?.email
        ? r.referred.email.replace(/(.{2}).*(@.*)/, '$1***$2')
        : '—',
    }));

    return {
      code,
      isEnabled: config.isEnabled,
      rewardType: config.rewardType,
      rewardValue: config.rewardValue,
      referredDiscountPercent: config.referredDiscountPercent,
      totalReferrals,
      conversions,
      rewardsGranted,
      history,
    };
  }

  // ─── Stripe coupon for referred discount ─────────────────────────────────

  /**
   * Creates/returns a Stripe coupon for the parent referral program's new-user discount.
   * Shared coupon (not per-influencer) since it's program-wide.
   */
  async getOrCreateReferralCoupon(discountPercent: number): Promise<string> {
    const couponId = `CYLUX_PARENT_REF_${Math.round(discountPercent)}`;
    try {
      await stripe.coupons.retrieve(couponId);
      return couponId;
    } catch {
      // Doesn't exist — create it
      await stripe.coupons.create({
        id: couponId,
        percent_off: discountPercent,
        duration: 'once',
        name: `${discountPercent}% off — Friend referral`,
      });
      return couponId;
    }
  }
}

export const parentReferralService = new ParentReferralService();
