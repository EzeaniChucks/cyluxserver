// cyluxserver/src/entities/Blog.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('blog_post')
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** URL-friendly slug, unique. Auto-generated from title on creation. */
  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  excerpt: string;

  /** HTML content */
  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true, type: 'varchar' })
  coverImageUrl: string | null;

  /** Cloudinary public_id — used to destroy the asset when post or image is replaced */
  @Column({ nullable: true, type: 'varchar' })
  cloudinaryPublicId: string | null;

  @Column({ default: 'Cylux Team' })
  authorName: string;

  @Column({ nullable: true, type: 'varchar' })
  authorAvatarUrl: string | null;

  @Column({ type: 'simple-json', default: '[]' })
  tags: string[];

  @Column({ default: false })
  isPublished: boolean;

  @Column({ nullable: true, type: 'timestamptz' })
  publishedAt: Date | null;

  @Column({ default: 5 })
  readTimeMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
