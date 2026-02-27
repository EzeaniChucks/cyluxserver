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
exports.walletService = exports.WalletService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const database_1 = require("../database");
const Wallet_1 = require("../entities/Wallet");
const WalletTransaction_1 = require("../entities/WalletTransaction");
const PayoutConfig_1 = require("../entities/PayoutConfig");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-06-20',
});
const walletRepo = () => database_1.AppDataSource.getRepository(Wallet_1.WalletEntity);
const txRepo = () => database_1.AppDataSource.getRepository(WalletTransaction_1.WalletTransactionEntity);
const configRepo = () => database_1.AppDataSource.getRepository(PayoutConfig_1.PayoutConfigEntity);
class WalletService {
    // ─── Payout Config (admin-controlled, singleton row) ─────────────────────
    getPayoutConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            let config = yield configRepo().findOne({ where: {} });
            if (!config) {
                config = yield configRepo().save(configRepo().create({}));
            }
            return config;
        });
    }
    updatePayoutConfig(data, adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield this.getPayoutConfig();
            Object.assign(config, data, { updatedByAdminId: adminId });
            return configRepo().save(config);
        });
    }
    // ─── Wallet Access ────────────────────────────────────────────────────────
    getOrCreate(ownerId, ownerType) {
        return __awaiter(this, void 0, void 0, function* () {
            let wallet = yield walletRepo().findOne({ where: { ownerId, ownerType } });
            if (!wallet) {
                wallet = yield walletRepo().save(walletRepo().create({ ownerId, ownerType }));
            }
            return wallet;
        });
    }
    getWalletSummary(ownerId, ownerType) {
        return __awaiter(this, void 0, void 0, function* () {
            const wallet = yield this.getOrCreate(ownerId, ownerType);
            const config = yield this.getPayoutConfig();
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
        });
    }
    getTransactions(ownerId_1, ownerType_1) {
        return __awaiter(this, arguments, void 0, function* (ownerId, ownerType, page = 1, limit = 20) {
            const wallet = yield this.getOrCreate(ownerId, ownerType);
            const [transactions, total] = yield txRepo().findAndCount({
                where: { walletId: wallet.id },
                order: { createdAt: 'DESC' },
                skip: (page - 1) * limit,
                take: limit,
            });
            return { transactions, total, page, pages: Math.ceil(total / limit) };
        });
    }
    // ─── Credit earnings ──────────────────────────────────────────────────────
    /**
     * Add earnings to a wallet. Funds are held for `holdDays` before becoming
     * withdrawable (fraud buffer — gives time to clawback on refund/chargeback).
     */
    credit(ownerId, ownerType, amountUsd, description, referenceId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (amountUsd <= 0)
                return;
            const config = yield this.getPayoutConfig();
            const wallet = yield this.getOrCreate(ownerId, ownerType);
            const availableAt = new Date();
            availableAt.setDate(availableAt.getDate() + config.holdDays);
            wallet.pendingUsd = parseFloat((Number(wallet.pendingUsd) + amountUsd).toFixed(2));
            wallet.lifetimeEarnedUsd = parseFloat((Number(wallet.lifetimeEarnedUsd) + amountUsd).toFixed(2));
            yield walletRepo().save(wallet);
            yield txRepo().save(txRepo().create({
                walletId: wallet.id,
                type: 'credit',
                amountUsd,
                description,
                referenceId: referenceId || null,
                status: 'pending',
                availableAt,
            }));
        });
    }
    // ─── Cron: release held funds ─────────────────────────────────────────────
    /**
     * Called periodically (every hour) to move pending credits whose hold
     * period has expired into the available balance.
     */
    releaseHeldFunds() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const pending = yield txRepo().find({ where: { type: 'credit', status: 'pending' } });
            let released = 0;
            for (const tx of pending) {
                if (!tx.availableAt || tx.availableAt > now)
                    continue;
                const wallet = yield walletRepo().findOne({ where: { id: tx.walletId } });
                if (!wallet)
                    continue;
                wallet.balanceUsd = parseFloat((Number(wallet.balanceUsd) + Number(tx.amountUsd)).toFixed(2));
                wallet.pendingUsd = parseFloat(Math.max(0, Number(wallet.pendingUsd) - Number(tx.amountUsd)).toFixed(2));
                yield walletRepo().save(wallet);
                tx.status = 'available';
                yield txRepo().save(tx);
                released++;
            }
            return released;
        });
    }
    // ─── Stripe Connect onboarding ────────────────────────────────────────────
    getConnectOnboardingUrl(ownerId, ownerType, email, returnUrl, refreshUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const wallet = yield this.getOrCreate(ownerId, ownerType);
            // Create Express account on first call
            if (!wallet.stripeConnectAccountId) {
                const account = yield stripe.accounts.create({
                    type: 'express',
                    email,
                    capabilities: { transfers: { requested: true } },
                    metadata: { ownerId, ownerType },
                });
                wallet.stripeConnectAccountId = account.id;
                yield walletRepo().save(wallet);
            }
            const accountLink = yield stripe.accountLinks.create({
                account: wallet.stripeConnectAccountId,
                type: 'account_onboarding',
                return_url: returnUrl,
                refresh_url: refreshUrl,
            });
            return accountLink.url;
        });
    }
    /**
     * Called by the Stripe Connect webhook when account.updated fires.
     * Marks the wallet as fully onboarded once Stripe confirms KYC passed.
     */
    handleConnectAccountUpdated(stripeAccountId) {
        return __awaiter(this, void 0, void 0, function* () {
            const wallet = yield walletRepo().findOne({ where: { stripeConnectAccountId: stripeAccountId } });
            if (!wallet)
                return;
            const account = yield stripe.accounts.retrieve(stripeAccountId);
            if (account.details_submitted && account.charges_enabled) {
                wallet.stripeConnectOnboarded = true;
                yield walletRepo().save(wallet);
            }
        });
    }
    // ─── Withdrawal (bank payout via Stripe transfer) ─────────────────────────
    withdraw(ownerId, ownerType, amountUsd) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield this.getPayoutConfig();
            const minWithdrawal = ownerType === 'influencer'
                ? Number(config.minWithdrawalUsdInfluencer)
                : Number(config.minWithdrawalUsdParent);
            const wallet = yield this.getOrCreate(ownerId, ownerType);
            if (!wallet.stripeConnectOnboarded || !wallet.stripeConnectAccountId) {
                throw new Error('Bank account not connected. Please connect your bank account first.');
            }
            if (Number(wallet.balanceUsd) < minWithdrawal) {
                throw new Error(`Minimum withdrawal is $${minWithdrawal.toFixed(2)}. Your available balance is $${Number(wallet.balanceUsd).toFixed(2)}.`);
            }
            if (Number(wallet.balanceUsd) < amountUsd) {
                throw new Error('Requested amount exceeds available balance.');
            }
            const amountCents = Math.floor(amountUsd * 100);
            const transfer = yield stripe.transfers.create({
                amount: amountCents,
                currency: 'usd',
                destination: wallet.stripeConnectAccountId,
                metadata: { ownerId, ownerType, walletId: wallet.id },
            });
            wallet.balanceUsd = parseFloat((Number(wallet.balanceUsd) - amountUsd).toFixed(2));
            wallet.totalWithdrawnUsd = parseFloat((Number(wallet.totalWithdrawnUsd) + amountUsd).toFixed(2));
            yield walletRepo().save(wallet);
            // Mark available credits as paid out
            yield txRepo()
                .createQueryBuilder()
                .update(WalletTransaction_1.WalletTransactionEntity)
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
        });
    }
    // ─── Apply as billing credit (reduces next Stripe invoice) ───────────────
    /**
     * Deducts `amountUsd` from the wallet and applies it as a negative balance
     * transaction on the user's Stripe customer account, reducing their next invoice.
     */
    applyBillingCredit(ownerId, ownerType, amountUsd, stripeCustomerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const wallet = yield this.getOrCreate(ownerId, ownerType);
            if (Number(wallet.balanceUsd) < amountUsd) {
                throw new Error('Insufficient available balance.');
            }
            const amountCents = Math.floor(amountUsd * 100);
            // Negative amount = credit on the Stripe customer (reduces next invoice)
            yield stripe.customers.createBalanceTransaction(stripeCustomerId, {
                amount: -amountCents,
                currency: 'usd',
                description: 'Cylux wallet credit applied to subscription',
            });
            wallet.balanceUsd = parseFloat((Number(wallet.balanceUsd) - amountUsd).toFixed(2));
            yield walletRepo().save(wallet);
            yield txRepo().save(txRepo().create({
                walletId: wallet.id,
                type: 'billing_credit',
                amountUsd,
                description: 'Applied as credit toward subscription',
                status: 'applied',
            }));
        });
    }
    // ─── Admin overview ───────────────────────────────────────────────────────
    getAllWallets() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 20, ownerType) {
            const qb = walletRepo().createQueryBuilder('w');
            if (ownerType)
                qb.where('w.ownerType = :ownerType', { ownerType });
            qb.orderBy('w.lifetimeEarnedUsd', 'DESC')
                .skip((page - 1) * limit)
                .take(limit);
            const [wallets, total] = yield qb.getManyAndCount();
            const allWallets = yield walletRepo().find();
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
        });
    }
    getWithdrawalHistory() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 20) {
            const [transactions, total] = yield txRepo().findAndCount({
                where: { type: 'withdrawal' },
                order: { createdAt: 'DESC' },
                skip: (page - 1) * limit,
                take: limit,
            });
            return { transactions, total, page, pages: Math.ceil(total / limit) };
        });
    }
}
exports.WalletService = WalletService;
exports.walletService = new WalletService();
//# sourceMappingURL=wallet.service.js.map