// cyluxserver/src/controllers/blog.controller.ts
import { Request, Response } from 'express';
import multer from 'multer';
import { blogService } from '../services/blog.service';
import { ApiResponse } from '../utils/response';

// Multer: memory storage, 10 MB limit, images only
export const blogImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
}).single('image');

export class BlogController {
  // ─── Public ───────────────────────────────────────────────────────────────

  getAllPublished = async (req: any, res: any) => {
    try {
      const page  = req.query.page  ? parseInt(String(req.query.page))  : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit)) : 12;
      const result = await blogService.getAllPublished(page, limit);
      return ApiResponse.success(res, result, 'Blog posts');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  getBySlug = async (req: any, res: any) => {
    try {
      const post = await blogService.getBySlug(req.params.slug);
      if (!post) return ApiResponse.error(res, 'Post not found', 404);
      return ApiResponse.success(res, post, 'Blog post');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  // ─── Admin ────────────────────────────────────────────────────────────────

  getAllAdmin = async (req: any, res: any) => {
    try {
      const page  = req.query.page  ? parseInt(String(req.query.page))  : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit)) : 50;
      const result = await blogService.getAllAdmin(page, limit);
      return ApiResponse.success(res, result, 'All blog posts');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  getById = async (req: any, res: any) => {
    try {
      const post = await blogService.getById(req.params.id);
      if (!post) return ApiResponse.error(res, 'Post not found', 404);
      return ApiResponse.success(res, post, 'Blog post');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  create = async (req: any, res: any) => {
    try {
      const { title, excerpt, content, coverImageUrl, cloudinaryPublicId,
              authorName, authorAvatarUrl, tags, isPublished, readTimeMinutes } = req.body;
      if (!title || !excerpt || !content) {
        return ApiResponse.error(res, 'title, excerpt, and content are required', 400);
      }
      const post = await blogService.create({
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
      return ApiResponse.success(res, post, 'Post created', 201);
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };

  update = async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const data = { ...req.body };
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
      const post = await blogService.update(id, data);
      return ApiResponse.success(res, post, 'Post updated');
    } catch (err: any) {
      return ApiResponse.error(res, err.message, err.message === 'Post not found' ? 404 : 500);
    }
  };

  delete = async (req: any, res: any) => {
    try {
      await blogService.delete(req.params.id);
      return ApiResponse.success(res, null, 'Post deleted');
    } catch (err: any) {
      return ApiResponse.error(res, err.message, err.message === 'Post not found' ? 404 : 500);
    }
  };

  uploadImage = async (req: any, res: any) => {
    try {
      if (!req.file) return ApiResponse.error(res, 'No image file provided', 400);
      const { url, publicId } = await blogService.uploadImage(req.file.buffer, req.file.mimetype);
      return ApiResponse.success(res, { url, publicId }, 'Image uploaded');
    } catch (err: any) {
      return ApiResponse.error(res, err.message);
    }
  };
}

export const blogController = new BlogController();
