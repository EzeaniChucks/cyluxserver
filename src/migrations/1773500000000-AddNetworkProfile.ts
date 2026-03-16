import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNetworkProfile1773500000000 implements MigrationInterface {
  name = "AddNetworkProfile1773500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "network_profile_entity" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "parentId" uuid NOT NULL,
        "nextdnsApiKey" character varying,
        "nextdnsProfileId" character varying,
        "nextdnsProfileName" character varying,
        "autoSync" boolean NOT NULL DEFAULT true,
        "enabled" boolean NOT NULL DEFAULT false,
        "extraBlockedDomains" text,
        "lastSyncAt" TIMESTAMP,
        "lastSyncCount" integer NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_network_profile_parentId" UNIQUE ("parentId"),
        CONSTRAINT "PK_network_profile_entity" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "network_profile_entity"
        ADD CONSTRAINT "FK_network_profile_parent"
        FOREIGN KEY ("parentId")
        REFERENCES "parent_entity"("id")
        ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "network_profile_entity" DROP CONSTRAINT "FK_network_profile_parent"`
    );
    await queryRunner.query(`DROP TABLE "network_profile_entity"`);
  }
}
