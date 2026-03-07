import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSmartDevices1772633618639 implements MigrationInterface {
    name = 'AddSmartDevices1772633618639'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "smart_devices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "parentId" uuid NOT NULL, "platform" character varying NOT NULL, "externalDeviceId" character varying NOT NULL, "deviceName" character varying NOT NULL, "accessToken" text NOT NULL, "refreshToken" text, "tokenExpiry" TIMESTAMP WITH TIME ZONE, "baseUrl" character varying, "linkedChildId" character varying, "isActive" boolean NOT NULL DEFAULT true, "lastControlledAt" TIMESTAMP WITH TIME ZONE, "lastAction" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_319e203c8251f280e50298762be" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8fe743af8f952ff728c17fd199" ON "smart_devices" ("parentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_c9db7b2c17b64a2a51976faa94" ON "smart_devices" ("linkedChildId") `);
        await queryRunner.query(`ALTER TABLE "smart_devices" ADD CONSTRAINT "FK_8fe743af8f952ff728c17fd199a" FOREIGN KEY ("parentId") REFERENCES "parent_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "smart_devices" DROP CONSTRAINT "FK_8fe743af8f952ff728c17fd199a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c9db7b2c17b64a2a51976faa94"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8fe743af8f952ff728c17fd199"`);
        await queryRunner.query(`DROP TABLE "smart_devices"`);
    }

}
