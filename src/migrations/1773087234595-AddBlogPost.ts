import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBlogPost1773087234595 implements MigrationInterface {
    name = 'AddBlogPost1773087234595'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "blog_post" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" character varying NOT NULL, "title" character varying NOT NULL, "excerpt" text NOT NULL, "content" text NOT NULL, "coverImageUrl" character varying, "cloudinaryPublicId" character varying, "authorName" character varying NOT NULL DEFAULT 'Cylux Team', "authorAvatarUrl" character varying, "tags" text NOT NULL DEFAULT '[]', "isPublished" boolean NOT NULL DEFAULT false, "publishedAt" TIMESTAMP WITH TIME ZONE, "readTimeMinutes" integer NOT NULL DEFAULT '5', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7a1f994eda1ad6e18788ca90b9e" UNIQUE ("slug"), CONSTRAINT "PK_694e842ad1c2b33f5939de6fede" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "blog_post"`);
    }

}
