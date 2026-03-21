import { MigrationInterface, QueryRunner } from "typeorm";

export class CheckingNewMigrations1773862910264 implements MigrationInterface {
    name = 'CheckingNewMigrations1773862910264'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "network_profile_entity" DROP CONSTRAINT "FK_network_profile_parent"`);
        await queryRunner.query(`ALTER TABLE "network_profile_entity" ADD CONSTRAINT "FK_87678e46f89980ba70845961576" FOREIGN KEY ("parentId") REFERENCES "parent_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "network_profile_entity" DROP CONSTRAINT "FK_87678e46f89980ba70845961576"`);
        await queryRunner.query(`ALTER TABLE "network_profile_entity" ADD CONSTRAINT "FK_network_profile_parent" FOREIGN KEY ("parentId") REFERENCES "parent_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
