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
exports.blogService = exports.BlogService = void 0;
// cyluxserver/src/services/blog.service.ts
const database_1 = require("../database");
const Blog_1 = require("../entities/Blog");
const cloudinary_1 = require("cloudinary");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/[\s]+/g, '-')
        .replace(/-+/g, '-');
}
function uniqueSlug(base, repo, excludeId) {
    return __awaiter(this, void 0, void 0, function* () {
        let candidate = base;
        let counter = 1;
        while (true) {
            const existing = yield repo.findOne({ where: { slug: candidate } });
            if (!existing || existing.id === excludeId)
                return candidate;
            candidate = `${base}-${counter++}`;
        }
    });
}
class BlogService {
    constructor() {
        this.repo = database_1.AppDataSource.getRepository(Blog_1.BlogPost);
    }
    /** Public: paginated published posts */
    getAllPublished() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 12) {
            const [posts, total] = yield this.repo.findAndCount({
                where: { isPublished: true },
                order: { publishedAt: 'DESC' },
                take: limit,
                skip: (page - 1) * limit,
                select: ['id', 'slug', 'title', 'excerpt', 'coverImageUrl', 'authorName',
                    'tags', 'publishedAt', 'readTimeMinutes', 'createdAt'],
            });
            return { posts, total, page, limit };
        });
    }
    /** Public: single post by slug */
    getBySlug(slug) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.repo.findOne({ where: { slug, isPublished: true } });
        });
    }
    /** Admin: all posts (published + drafts) */
    getAllAdmin() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 50) {
            const [posts, total] = yield this.repo.findAndCount({
                order: { createdAt: 'DESC' },
                take: limit,
                skip: (page - 1) * limit,
            });
            return { posts, total, page, limit };
        });
    }
    /** Admin: get single post by id (for editing) */
    getById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.repo.findOne({ where: { id } });
        });
    }
    /** Admin: create */
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const base = slugify(data.title);
            const slug = yield uniqueSlug(base, this.repo);
            const post = this.repo.create(Object.assign(Object.assign({}, data), { slug, tags: (_a = data.tags) !== null && _a !== void 0 ? _a : [], isPublished: (_b = data.isPublished) !== null && _b !== void 0 ? _b : false, publishedAt: data.isPublished ? new Date() : null, coverImageUrl: (_c = data.coverImageUrl) !== null && _c !== void 0 ? _c : null, cloudinaryPublicId: (_d = data.cloudinaryPublicId) !== null && _d !== void 0 ? _d : null, readTimeMinutes: (_e = data.readTimeMinutes) !== null && _e !== void 0 ? _e : this.estimateReadTime(data.content) }));
            return this.repo.save(post);
        });
    }
    /** Admin: update */
    update(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const post = yield this.repo.findOne({ where: { id } });
            if (!post)
                throw new Error('Post not found');
            // Destroy old Cloudinary image if replaced or removed
            const imageChanged = data.coverImageUrl !== undefined && data.coverImageUrl !== post.coverImageUrl;
            const imageRemoved = data.removeImage === true;
            if ((imageChanged || imageRemoved) && post.cloudinaryPublicId) {
                yield this.destroyCloudinaryImage(post.cloudinaryPublicId);
            }
            // Handle publish state transition
            if (data.isPublished === true && !post.isPublished) {
                data.publishedAt = new Date();
            }
            // Re-slug if title changed
            if (data.title && data.title !== post.title) {
                const base = slugify(data.title);
                data.slug = yield uniqueSlug(base, this.repo, id);
            }
            if (imageRemoved) {
                data.coverImageUrl = null;
                data.cloudinaryPublicId = null;
            }
            Object.assign(post, data);
            delete post.removeImage;
            return this.repo.save(post);
        });
    }
    /** Admin: delete — destroys Cloudinary image before removing the record */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const post = yield this.repo.findOne({ where: { id } });
            if (!post)
                throw new Error('Post not found');
            if (post.cloudinaryPublicId) {
                yield this.destroyCloudinaryImage(post.cloudinaryPublicId);
            }
            yield this.repo.remove(post);
        });
    }
    /** Admin: upload image to Cloudinary, returns { url, publicId } */
    uploadImage(fileBuffer, mimetype) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const stream = cloudinary_1.v2.uploader.upload_stream({
                    folder: 'cylux-blog',
                    resource_type: 'image',
                    transformation: [{ width: 1200, height: 630, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
                }, (error, result) => {
                    if (error || !result)
                        return reject(error !== null && error !== void 0 ? error : new Error('Upload failed'));
                    resolve({ url: result.secure_url, publicId: result.public_id });
                });
                stream.end(fileBuffer);
            });
        });
    }
    destroyCloudinaryImage(publicId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield cloudinary_1.v2.uploader.destroy(publicId);
            }
            catch (e) {
                console.warn(`[BlogService] Cloudinary destroy failed for ${publicId}:`, e);
            }
        });
    }
    estimateReadTime(html) {
        const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
        return Math.max(1, Math.ceil(words / 200));
    }
}
exports.BlogService = BlogService;
exports.blogService = new BlogService();
//# sourceMappingURL=blog.service.js.map