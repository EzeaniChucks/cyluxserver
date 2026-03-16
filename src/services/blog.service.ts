// cyluxserver/src/services/blog.service.ts
import { AppDataSource } from '../database';
import { BlogPost } from '../entities/Blog';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-');
}

async function uniqueSlug(base: string, repo: any, excludeId?: string): Promise<string> {
  let candidate = base;
  let counter = 1;
  while (true) {
    const existing = await repo.findOne({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

export class BlogService {
  private repo = AppDataSource.getRepository(BlogPost);

  /** Public: paginated published posts */
  async getAllPublished(page = 1, limit = 12) {
    const [posts, total] = await this.repo.findAndCount({
      where: { isPublished: true },
      order: { publishedAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
      select: ['id', 'slug', 'title', 'excerpt', 'coverImageUrl', 'authorName',
               'tags', 'publishedAt', 'readTimeMinutes', 'createdAt'],
    });
    return { posts, total, page, limit };
  }

  /** Public: single post by slug */
  async getBySlug(slug: string) {
    return this.repo.findOne({ where: { slug, isPublished: true } });
  }

  /** Admin: all posts (published + drafts) */
  async getAllAdmin(page = 1, limit = 50) {
    const [posts, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { posts, total, page, limit };
  }

  /** Admin: get single post by id (for editing) */
  async getById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  /** Admin: create */
  async create(data: {
    title: string;
    excerpt: string;
    content: string;
    coverImageUrl?: string;
    cloudinaryPublicId?: string;
    authorName?: string;
    authorAvatarUrl?: string;
    tags?: string[];
    isPublished?: boolean;
    readTimeMinutes?: number;
  }) {
    const base = slugify(data.title);
    const slug = await uniqueSlug(base, this.repo);
    const post = this.repo.create({
      ...data,
      slug,
      tags: data.tags ?? [],
      isPublished: data.isPublished ?? false,
      publishedAt: data.isPublished ? new Date() : null,
      coverImageUrl: data.coverImageUrl ?? null,
      cloudinaryPublicId: data.cloudinaryPublicId ?? null,
      readTimeMinutes: data.readTimeMinutes ?? this.estimateReadTime(data.content),
    });
    return this.repo.save(post);
  }

  /** Admin: update */
  async update(id: string, data: {
    title?: string;
    excerpt?: string;
    content?: string;
    coverImageUrl?: string | null;
    cloudinaryPublicId?: string | null;
    authorName?: string;
    authorAvatarUrl?: string | null;
    tags?: string[];
    isPublished?: boolean;
    readTimeMinutes?: number;
    removeImage?: boolean;
  }) {
    const post = await this.repo.findOne({ where: { id } });
    if (!post) throw new Error('Post not found');

    // Destroy old Cloudinary image if replaced or removed
    const imageChanged = data.coverImageUrl !== undefined && data.coverImageUrl !== post.coverImageUrl;
    const imageRemoved = data.removeImage === true;

    if ((imageChanged || imageRemoved) && post.cloudinaryPublicId) {
      await this.destroyCloudinaryImage(post.cloudinaryPublicId);
    }

    // Handle publish state transition
    if (data.isPublished === true && !post.isPublished) {
      (data as any).publishedAt = new Date();
    }

    // Re-slug if title changed
    if (data.title && data.title !== post.title) {
      const base = slugify(data.title);
      (data as any).slug = await uniqueSlug(base, this.repo, id);
    }

    if (imageRemoved) {
      (data as any).coverImageUrl = null;
      (data as any).cloudinaryPublicId = null;
    }

    Object.assign(post, data);
    delete (post as any).removeImage;
    return this.repo.save(post);
  }

  /** Admin: delete — destroys Cloudinary image before removing the record */
  async delete(id: string) {
    const post = await this.repo.findOne({ where: { id } });
    if (!post) throw new Error('Post not found');

    if (post.cloudinaryPublicId) {
      await this.destroyCloudinaryImage(post.cloudinaryPublicId);
    }
    await this.repo.remove(post);
  }

  /** Admin: upload image to Cloudinary, returns { url, publicId } */
  async uploadImage(fileBuffer: Buffer, mimetype: string): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'cylux-blog',
          resource_type: 'image',
          transformation: [{ width: 1200, height: 630, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      stream.end(fileBuffer);
    });
  }

  private async destroyCloudinaryImage(publicId: string) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      console.warn(`[BlogService] Cloudinary destroy failed for ${publicId}:`, e);
    }
  }

  private estimateReadTime(html: string): number {
    const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }
}

export const blogService = new BlogService();
