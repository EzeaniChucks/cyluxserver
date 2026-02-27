import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInfluencerAdminSystem1772040534122 implements MigrationInterface {
    name = 'AddInfluencerAdminSystem1772040534122'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "plan_config_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "planId" character varying NOT NULL, "name" character varying NOT NULL, "description" text NOT NULL, "price" double precision, "maxDevices" integer NOT NULL, "maxGeofences" integer NOT NULL, "vpnFiltering" boolean NOT NULL DEFAULT false, "realTimeAlerts" boolean NOT NULL DEFAULT false, "smartTv" boolean NOT NULL DEFAULT false, "advancedReports" boolean NOT NULL DEFAULT false, "schoolDashboard" boolean NOT NULL DEFAULT false, "stripePriceId" character varying, "trialDays" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "updatedByAdminId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f16e9768f32f2ef25d2f15d3bf8" UNIQUE ("planId"), CONSTRAINT "PK_3ca47b9b4567a43b061074211f1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "referral_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "influencerId" uuid NOT NULL, "referredParentId" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'registered', "discountPercent" double precision NOT NULL DEFAULT '0', "firstPaymentAmountCents" integer, "rewardAmount" double precision, "rewardType" character varying, "rewardPaidAt" TIMESTAMP, "plan" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_188c5a14d6d2d18166f13014287" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "influencer_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "code" character varying NOT NULL, "discountPercent" double precision NOT NULL DEFAULT '20', "stripeCouponId" character varying, "rewardType" character varying, "rewardValue" double precision, "totalReferrals" integer NOT NULL DEFAULT '0', "totalConversions" integer NOT NULL DEFAULT '0', "totalEarningsUsd" double precision NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_565f795b038bbdbfa97fee292fe" UNIQUE ("email"), CONSTRAINT "UQ_8cb57774c251036ce657497d951" UNIQUE ("code"), CONSTRAINT "PK_0a206632a2a5961056da9d8399e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "admin_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "name" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'admin', "isActive" boolean NOT NULL DEFAULT true, "lastLoginAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2a4c8cb05264be7377c625c2715" UNIQUE ("email"), CONSTRAINT "PK_bc992df5ddb70aefb955b8a0c92" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "parent_entity" ADD "referralCode" character varying`);
        await queryRunner.query(`ALTER TABLE "referral_entity" ADD CONSTRAINT "FK_a61203874642b7670367eff6a19" FOREIGN KEY ("influencerId") REFERENCES "influencer_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "referral_entity" ADD CONSTRAINT "FK_cfa63bca7795637241f795abb24" FOREIGN KEY ("referredParentId") REFERENCES "parent_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "referral_entity" DROP CONSTRAINT "FK_cfa63bca7795637241f795abb24"`);
        await queryRunner.query(`ALTER TABLE "referral_entity" DROP CONSTRAINT "FK_a61203874642b7670367eff6a19"`);
        await queryRunner.query(`ALTER TABLE "parent_entity" DROP COLUMN "referralCode"`);
        await queryRunner.query(`DROP TABLE "admin_entity"`);
        await queryRunner.query(`DROP TABLE "influencer_entity"`);
        await queryRunner.query(`DROP TABLE "referral_entity"`);
        await queryRunner.query(`DROP TABLE "plan_config_entity"`);
    }

}
