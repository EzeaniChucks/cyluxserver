import Stripe from 'stripe';
import { AppDataSource } from '../database';
import { WalletEntity, WalletOwnerType } from '../entities/Wallet';
import { WalletTransactionEntity } from '../entities/WalletTransaction';
import { PayoutConfigEntity } from '../entities/PayoutConfig';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20' as any,
});

const walletRepo = () => AppDataSource.getRepository(WalletEntity);
const txRepo = () => AppDataSource.getRepository(WalletTransactionEntity);
const configRepo = () => AppDataSource.getRepository(PayoutConfigEntity);

export class WalletService {

  // ─── Payout Config (admin-controlled, singleton row) ─────────────────────

  async getPayoutConfig(): Promise<PayoutConfigEntity> {
    let config = await configRepo().findOne({ where: {} });
    if (!config) {
      config = await configRepo().save(configRepo().create({}));
    }
    return config;
  }

  async updatePayoutConfig(
    data: Partial<Pick<PayoutConfigEntity, 'minWithdrawalUsdInfluencer' | 'minWithdrawalUsdParent' | 'holdDays'>>,
    adminId: string,
  ): Promise<PayoutConfigEntity> {
    const config = await this.getPayoutConfig();
    Object.assign(config, data, { updatedByAdminId: adminId });
    return configRepo().save(config);
  }

  // ─── Wallet Access ────────────────────────────────────────────────────────

  async getOrCreate(ownerId: string, ownerType: WalletOwnerType): Promise<WalletEntity> {
    let wallet = await walletRepo().findOne({ where: { ownerId, ownerType } });
    if (!wallet) {
      wallet = await walletRepo().save(walletRepo().create({ ownerId, ownerType }));
    }
    return wallet;
  }

  async getWalletSummary(ownerId: string, ownerType: WalletOwnerType) {
    const wallet = await this.getOrCreate(ownerId, ownerType);
    const config = await this.getPayoutConfig();
    const minWithdrawal = ownerType === 'influencer'
      ? Number(config.minWithdrawalUsdInfluencer)
      : Number(config.minWithdrawalUsdParent);
    const balance = Number(wallet.balanceUsd);

    return {
      id: wallet.id,
      balanceUsd: balance,
      pendingUsd: Number(wallet.pendingUsd),
      lifetimeEarnedUsd: Number(wallet.lifetimeEarnedUsd),
      totalWithdrawnUsd: Number(wallet.totalWithdrawnUsd),
      stripeConnectOnboarded: wallet.stripeConnectOnboarded,
      hasConnectAccount: !!wallet.stripeConnectAccountId,
      country: wallet.country,
      currency: wallet.currency,
      minWithdrawal,
      canWithdraw: balance >= minWithdrawal && wallet.stripeConnectOnboarded,
      amountToMinimum: Math.max(0, parseFloat((minWithdrawal - balance).toFixed(2))),
    };
  }

  async getTransactions(ownerId: string, ownerType: WalletOwnerType, page = 1, limit = 20) {
    const wallet = await this.getOrCreate(ownerId, ownerType);
    const [transactions, total] = await txRepo().findAndCount({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { transactions, total, page, pages: Math.ceil(total / limit) };
  }

  // ─── Credit earnings ──────────────────────────────────────────────────────

  /**
   * Add earnings to a wallet. Funds are held for `holdDays` before becoming
   * withdrawable (fraud buffer — gives time to clawback on refund/chargeback).
   */
  async credit(
    ownerId: string,
    ownerType: WalletOwnerType,
    amountUsd: number,
    description: string,
    referenceId?: string,
  ): Promise<void> {
    if (amountUsd <= 0) return;
    const config = await this.getPayoutConfig();
    const wallet = await this.getOrCreate(ownerId, ownerType);

    const availableAt = new Date();
    availableAt.setDate(availableAt.getDate() + config.holdDays);

    wallet.pendingUsd = parseFloat((Number(wallet.pendingUsd) + amountUsd).toFixed(2));
    wallet.lifetimeEarnedUsd = parseFloat((Number(wallet.lifetimeEarnedUsd) + amountUsd).toFixed(2));
    await walletRepo().save(wallet);

    await txRepo().save(txRepo().create({
      walletId: wallet.id,
      type: 'credit',
      amountUsd,
      description,
      referenceId: referenceId || null,
      status: 'pending',
      availableAt,
    }));
  }

  // ─── Cron: release held funds ─────────────────────────────────────────────

  /**
   * Called periodically (every hour) to move pending credits whose hold
   * period has expired into the available balance.
   */
  async releaseHeldFunds(): Promise<number> {
    const now = new Date();
    const pending = await txRepo().find({ where: { type: 'credit', status: 'pending' } });

    let released = 0;
    for (const tx of pending) {
      if (!tx.availableAt || tx.availableAt > now) continue;

      const wallet = await walletRepo().findOne({ where: { id: tx.walletId } });
      if (!wallet) continue;

      wallet.balanceUsd = parseFloat((Number(wallet.balanceUsd) + Number(tx.amountUsd)).toFixed(2));
      wallet.pendingUsd = parseFloat(Math.max(0, Number(wallet.pendingUsd) - Number(tx.amountUsd)).toFixed(2));
      await walletRepo().save(wallet);

      tx.status = 'available';
      await txRepo().save(tx);
      released++;
    }
    return released;
  }

  // ─── Stripe Connect onboarding ────────────────────────────────────────────

  async getConnectOnboardingUrl(
    ownerId: string,
    ownerType: WalletOwnerType,
    email: string,
    returnUrl: string,
    refreshUrl: string,
  ): Promise<string> {
    const wallet = await this.getOrCreate(ownerId, ownerType);

    // Create Express account on first call
    if (!wallet.stripeConnectAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email,
        capabilities: { transfers: { requested: true } },
        metadata: { ownerId, ownerType },
      });
      wallet.stripeConnectAccountId = account.id;
      await walletRepo().save(wallet);
    }

    const accountLink = await stripe.accountLinks.create({
      account: wallet.stripeConnectAccountId,
      type: 'account_onboarding',
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });

    return accountLink.url;
  }

  /**
   * Called by the Stripe Connect webhook when account.updated fires.
   * Marks the wallet as fully onboarded once Stripe confirms KYC passed.
   */
  async handleConnectAccountUpdated(stripeAccountId: string): Promise<void> {
    const wallet = await walletRepo().findOne({ where: { stripeConnectAccountId: stripeAccountId } });
    if (!wallet) return;

    const account = await stripe.accounts.retrieve(stripeAccountId);
    if (account.details_submitted && account.charges_enabled) {
      wallet.stripeConnectOnboarded = true;
      await walletRepo().save(wallet);
    }
  }

  // ─── Withdrawal (bank payout via Stripe transfer) ─────────────────────────

  async withdraw(
    ownerId: string,
    ownerType: WalletOwnerType,
    amountUsd: number,
  ): Promise<WalletTransactionEntity> {
    const config = await this.getPayoutConfig();
    const minWithdrawal = ownerType === 'influencer'
      ? Number(config.minWithdrawalUsdInfluencer)
      : Number(config.minWithdrawalUsdParent);

    const wallet = await this.getOrCreate(ownerId, ownerType);

    if (!wallet.stripeConnectOnboarded || !wallet.stripeConnectAccountId) {
      throw new Error('Bank account not connected. Please connect your bank account first.');
    }
    if (Number(wallet.balanceUsd) < minWithdrawal) {
      throw new Error(
        `Minimum withdrawal is $${minWithdrawal.toFixed(2)}. Your available balance is $${Number(wallet.balanceUsd).toFixed(2)}.`,
      );
    }
    if (Number(wallet.balanceUsd) < amountUsd) {
      throw new Error('Requested amount exceeds available balance.');
    }

    const amountCents = Math.floor(amountUsd * 100);

    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: 'usd',
      destination: wallet.stripeConnectAccountId,
      metadata: { ownerId, ownerType, walletId: wallet.id },
    });

    wallet.balanceUsd = parseFloat((Number(wallet.balanceUsd) - amountUsd).toFixed(2));
    wallet.totalWithdrawnUsd = parseFloat((Number(wallet.totalWithdrawnUsd) + amountUsd).toFixed(2));
    await walletRepo().save(wallet);

    // Mark available credits as paid out
    await txRepo()
      .createQueryBuilder()
      .update(WalletTransactionEntity)
      .set({ status: 'paid_out' })
      .where('walletId = :walletId AND type = :type AND status = :status', {
        walletId: wallet.id, type: 'credit', status: 'available',
      })
      .execute();

    return txRepo().save(txRepo().create({
      walletId: wallet.id,
      type: 'withdrawal',
      amountUsd,
      description: 'Withdrawal to connected bank account',
      status: 'paid_out',
      stripeTransferId: transfer.id,
    }));
  }

  // ─── Apply as billing credit (reduces next Stripe invoice) ───────────────

  /**
   * Deducts `amountUsd` from the wallet and applies it as a negative balance
   * transaction on the user's Stripe customer account, reducing their next invoice.
   */
  async applyBillingCredit(
    ownerId: string,
    ownerType: WalletOwnerType,
    amountUsd: number,
    stripeCustomerId: string,
  ): Promise<void> {
    const wallet = await this.getOrCreate(ownerId, ownerType);

    if (Number(wallet.balanceUsd) < amountUsd) {
      throw new Error('Insufficient available balance.');
    }

    const amountCents = Math.floor(amountUsd * 100);

    // Negative amount = credit on the Stripe customer (reduces next invoice)
    await stripe.customers.createBalanceTransaction(stripeCustomerId, {
      amount: -amountCents,
      currency: 'usd',
      description: 'Cylux wallet credit applied to subscription',
    });

    wallet.balanceUsd = parseFloat((Number(wallet.balanceUsd) - amountUsd).toFixed(2));
    await walletRepo().save(wallet);

    await txRepo().save(txRepo().create({
      walletId: wallet.id,
      type: 'billing_credit',
      amountUsd,
      description: 'Applied as credit toward subscription',
      status: 'applied',
    }));
  }

  // ─── Admin overview ───────────────────────────────────────────────────────

  async getAllWallets(page = 1, limit = 20, ownerType?: WalletOwnerType) {
    const qb = walletRepo().createQueryBuilder('w');
    if (ownerType) qb.where('w.ownerType = :ownerType', { ownerType });
    qb.orderBy('w.lifetimeEarnedUsd', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [wallets, total] = await qb.getManyAndCount();
    const allWallets = await walletRepo().find();

    return {
      wallets: wallets.map(w => ({
        id: w.id,
        ownerId: w.ownerId,
        ownerType: w.ownerType,
        balanceUsd: Number(w.balanceUsd),
        pendingUsd: Number(w.pendingUsd),
        lifetimeEarnedUsd: Number(w.lifetimeEarnedUsd),
        totalWithdrawnUsd: Number(w.totalWithdrawnUsd),
        stripeConnectOnboarded: w.stripeConnectOnboarded,
        country: w.country,
        createdAt: w.createdAt,
      })),
      total,
      totals: {
        pendingUsd: parseFloat(allWallets.reduce((s, w) => s + Number(w.pendingUsd), 0).toFixed(2)),
        availableUsd: parseFloat(allWallets.reduce((s, w) => s + Number(w.balanceUsd), 0).toFixed(2)),
        withdrawnUsd: parseFloat(allWallets.reduce((s, w) => s + Number(w.totalWithdrawnUsd), 0).toFixed(2)),
        lifetimeUsd: parseFloat(allWallets.reduce((s, w) => s + Number(w.lifetimeEarnedUsd), 0).toFixed(2)),
      },
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getWithdrawalHistory(page = 1, limit = 20) {
    const [transactions, total] = await txRepo().findAndCount({
      where: { type: 'withdrawal' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { transactions, total, page, pages: Math.ceil(total / limit) };
  }
}

export const walletService = new WalletService();
