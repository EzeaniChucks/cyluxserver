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
exports.blogController = exports.BlogController = exports.blogImageUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const blog_service_1 = require("../services/blog.service");
const response_1 = require("../utils/response");
// Multer: memory storage, 10 MB limit, images only
exports.blogImageUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    },
}).single('image');
class BlogController {
    constructor() {
        // ─── Public ───────────────────────────────────────────────────────────────
        this.getAllPublished = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const page = req.query.page ? parseInt(String(req.query.page)) : 1;
                const limit = req.query.limit ? parseInt(String(req.query.limit)) : 12;
                const result = yield blog_service_1.blogService.getAllPublished(page, limit);
                return response_1.ApiResponse.success(res, result, 'Blog posts');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.getBySlug = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const post = yield blog_service_1.blogService.getBySlug(req.params.slug);
                if (!post)
                    return response_1.ApiResponse.error(res, 'Post not found', 404);
                return response_1.ApiResponse.success(res, post, 'Blog post');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        // ─── Admin ────────────────────────────────────────────────────────────────
        this.getAllAdmin = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const page = req.query.page ? parseInt(String(req.query.page)) : 1;
                const limit = req.query.limit ? parseInt(String(req.query.limit)) : 50;
                const result = yield blog_service_1.blogService.getAllAdmin(page, limit);
                return response_1.ApiResponse.success(res, result, 'All blog posts');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.getById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const post = yield blog_service_1.blogService.getById(req.params.id);
                if (!post)
                    return response_1.ApiResponse.error(res, 'Post not found', 404);
                return response_1.ApiResponse.success(res, post, 'Blog post');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.create = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { title, excerpt, content, coverImageUrl, cloudinaryPublicId, authorName, authorAvatarUrl, tags, isPublished, readTimeMinutes } = req.body;
                if (!title || !excerpt || !content) {
                    return response_1.ApiResponse.error(res, 'title, excerpt, and content are required', 400);
                }
                const post = yield blog_service_1.blogService.create({
                    title,
                    excerpt,
                    content,
                    coverImageUrl,
                    cloudinaryPublicId,
                    authorName,
                    authorAvatarUrl,
                    tags: Array.isArray(tags) ? tags : tags ? JSON.parse(tags) : [],
                    isPublished: isPublished === true || isPublished === 'true',
                    readTimeMinutes: readTimeMinutes ? parseInt(readTimeMinutes) : undefined,
                });
                return response_1.ApiResponse.success(res, post, 'Post created', 201);
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
        this.update = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const data = Object.assign({}, req.body);
                if (data.tags && typeof data.tags === 'string') {
                    data.tags = JSON.parse(data.tags);
                }
                if ('isPublished' in data) {
                    data.isPublished = data.isPublished === true || data.isPublished === 'true';
                }
                if ('removeImage' in data) {
                    data.removeImage = data.removeImage === true || data.removeImage === 'true';
                }
                if ('readTimeMinutes' in data && data.readTimeMinutes) {
                    data.readTimeMinutes = parseInt(data.readTimeMinutes);
                }
                const post = yield blog_service_1.blogService.update(id, data);
                return response_1.ApiResponse.success(res, post, 'Post updated');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message, err.message === 'Post not found' ? 404 : 500);
            }
        });
        this.delete = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield blog_service_1.blogService.delete(req.params.id);
                return response_1.ApiResponse.success(res, null, 'Post deleted');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message, err.message === 'Post not found' ? 404 : 500);
            }
        });
        this.uploadImage = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.file)
                    return response_1.ApiResponse.error(res, 'No image file provided', 400);
                const { url, publicId } = yield blog_service_1.blogService.uploadImage(req.file.buffer, req.file.mimetype);
                return response_1.ApiResponse.success(res, { url, publicId }, 'Image uploaded');
            }
            catch (err) {
                return response_1.ApiResponse.error(res, err.message);
            }
        });
    }
}
exports.BlogController = BlogController;
exports.blogController = new BlogController();
//# sourceMappingURL=blog.controller.js.map