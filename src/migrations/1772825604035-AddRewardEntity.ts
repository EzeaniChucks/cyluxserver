import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRewardEntity1772825604035 implements MigrationInterface {
    name = 'AddRewardEntity1772825604035'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "reward_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "parentId" character varying NOT NULL, "childId" character varying NOT NULL, "minutes" integer NOT NULL, "reason" character varying, "claimed" boolean NOT NULL DEFAULT false, "claimedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4d86733b11358cd7eda87e9d8b1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7466c04caf5a366b5f71e8d4e8" ON "reward_entity" ("childId") `);
        await queryRunner.query(`CREATE INDEX "IDX_0c6aed18b5e4ba0efaf614042f" ON "reward_entity" ("childId", "claimed") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_0c6aed18b5e4ba0efaf614042f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7466c04caf5a366b5f71e8d4e8"`);
        await queryRunner.query(`DROP TABLE "reward_entity"`);
    }

}
