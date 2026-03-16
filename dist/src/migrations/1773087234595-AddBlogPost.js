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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddBlogPost1773087234595 = void 0;
class AddBlogPost1773087234595 {
    constructor() {
        this.name = 'AddBlogPost1773087234595';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`CREATE TABLE "blog_post" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" character varying NOT NULL, "title" character varying NOT NULL, "excerpt" text NOT NULL, "content" text NOT NULL, "coverImageUrl" character varying, "cloudinaryPublicId" character varying, "authorName" character varying NOT NULL DEFAULT 'Cylux Team', "authorAvatarUrl" character varying, "tags" text NOT NULL DEFAULT '[]', "isPublished" boolean NOT NULL DEFAULT false, "publishedAt" TIMESTAMP WITH TIME ZONE, "readTimeMinutes" integer NOT NULL DEFAULT '5', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7a1f994eda1ad6e18788ca90b9e" UNIQUE ("slug"), CONSTRAINT "PK_694e842ad1c2b33f5939de6fede" PRIMARY KEY ("id"))`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`DROP TABLE "blog_post"`);
        });
    }
}
exports.AddBlogPost1773087234595 = AddBlogPost1773087234595;
//# sourceMappingURL=1773087234595-AddBlogPost.js.map