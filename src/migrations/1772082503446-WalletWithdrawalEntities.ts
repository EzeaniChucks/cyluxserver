import { MigrationInterface, QueryRunner } from "typeorm";

export class WalletWithdrawalEntities1772082503446 implements MigrationInterface {
    name = 'WalletWithdrawalEntities1772082503446'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "wallet_transaction_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "walletId" uuid NOT NULL, "type" character varying NOT NULL, "amountUsd" numeric(10,2) NOT NULL, "description" character varying NOT NULL, "referenceId" character varying, "status" character varying NOT NULL DEFAULT 'pending', "availableAt" TIMESTAMP WITH TIME ZONE, "stripeTransferId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9774b266b392224cb806d6d29ed" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "payout_config_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "minWithdrawalUsdInfluencer" numeric(10,2) NOT NULL DEFAULT '20', "minWithdrawalUsdParent" numeric(10,2) NOT NULL DEFAULT '10', "holdDays" integer NOT NULL DEFAULT '14', "updatedByAdminId" character varying, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_23e95d5007f290da9165a5f2193" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "parent_referral_config_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isEnabled" boolean NOT NULL DEFAULT true, "rewardType" character varying NOT NULL DEFAULT 'trial_extension_days', "rewardValue" double precision NOT NULL DEFAULT '7', "referredDiscountPercent" double precision NOT NULL DEFAULT '0', "updatedByAdminId" character varying, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_814bbde182e7d7f646391a3f8d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "parent_referral_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "referrerId" uuid NOT NULL, "referredId" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'registered', "plan" character varying, "firstPaymentAmountCents" integer, "rewardValue" double precision, "rewardType" character varying, "rewardGrantedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4e123d4ae233b38a95a09ad52be" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "wallet_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ownerId" character varying NOT NULL, "ownerType" character varying NOT NULL, "balanceUsd" numeric(10,2) NOT NULL DEFAULT '0', "pendingUsd" numeric(10,2) NOT NULL DEFAULT '0', "lifetimeEarnedUsd" numeric(10,2) NOT NULL DEFAULT '0', "totalWithdrawnUsd" numeric(10,2) NOT NULL DEFAULT '0', "stripeConnectAccountId" character varying, "stripeConnectOnboarded" boolean NOT NULL DEFAULT false, "country" character varying, "currency" character varying NOT NULL DEFAULT 'USD', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3e429a1b7a56251b6b8ed06050d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "parent_entity" ADD "ownReferralCode" character varying`);
        await queryRunner.query(`ALTER TABLE "parent_entity" ADD CONSTRAINT "UQ_df965fc56c80b6542c193aac009" UNIQUE ("ownReferralCode")`);
        await queryRunner.query(`ALTER TABLE "parent_referral_entity" ADD CONSTRAINT "FK_4fe073c98e6fa65f59a65afb060" FOREIGN KEY ("referrerId") REFERENCES "parent_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "parent_referral_entity" ADD CONSTRAINT "FK_507ea4c8e4f89403af40e3565ad" FOREIGN KEY ("referredId") REFERENCES "parent_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "parent_referral_entity" DROP CONSTRAINT "FK_507ea4c8e4f89403af40e3565ad"`);
        await queryRunner.query(`ALTER TABLE "parent_referral_entity" DROP CONSTRAINT "FK_4fe073c98e6fa65f59a65afb060"`);
        await queryRunner.query(`ALTER TABLE "parent_entity" DROP CONSTRAINT "UQ_df965fc56c80b6542c193aac009"`);
        await queryRunner.query(`ALTER TABLE "parent_entity" DROP COLUMN "ownReferralCode"`);
        await queryRunner.query(`DROP TABLE "wallet_entity"`);
        await queryRunner.query(`DROP TABLE "parent_referral_entity"`);
        await queryRunner.query(`DROP TABLE "parent_referral_config_entity"`);
        await queryRunner.query(`DROP TABLE "payout_config_entity"`);
        await queryRunner.query(`DROP TABLE "wallet_transaction_entity"`);
    }

}
