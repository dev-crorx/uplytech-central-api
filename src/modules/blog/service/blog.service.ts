// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('BlogService');

export class BlogService {
  async findAll(params: PaginationParams, filters?: { status?: string; authorId?: string; categoryId?: string; tag?: string }) {
    const where: Prisma.BlogPostWhereInput = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.authorId) where.authorId = filters.authorId;
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.tag) where.tags = { contains: filters.tag };
    const [data, total] = await Promise.all([
      prisma.blogPost.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { publishedAt: 'desc' },
        include: { author: { select: { id: true, username: true, displayName: true, avatar: true } }, category: { select: { id: true, name: true } } } }),
      prisma.blogPost.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findBySlug(slug: string) {
    const post = await prisma.blogPost.findFirst({ where: { slug },
      include: { author: { select: { id: true, username: true, displayName: true, avatar: true } }, category: true } });
    if (!post) throw new NotFoundError('Blog post');
    await prisma.blogPost.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } });
    return post;
  }

  async findById(id: string) {
    const post = await prisma.blogPost.findUnique({ where: { id },
      include: { author: { select: { id: true, username: true, displayName: true, avatar: true } }, category: true } });
    if (!post) throw new NotFoundError('Blog post');
    return post;
  }

  async create(data: { title: string; content: string; excerpt?: string; slug?: string; categoryId?: string; tags?: string; coverImage?: string; status?: string }, userId: string) {
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingSlug = await prisma.blogPost.findFirst({ where: { slug } });
    const finalSlug = existingSlug ? slug + '-' + Date.now() : slug;
    const post = await prisma.blogPost.create({
      data: { title: data.title, content: data.content, excerpt: data.excerpt || data.content.substring(0, 200), slug: finalSlug,
        categoryId: data.categoryId || null, tags: data.tags || null, coverImage: data.coverImage || null,
        status: data.status || 'DRAFT', authorId: userId, publishedAt: data.status === 'PUBLISHED' ? new Date() : null },
    });
    await eventBus.emit('blog.created', { type: 'blog.created', source: 'blog-service', data: { id: post.id }, userId });
    await createAuditEntry(userId, 'BLOG_CREATED', 'blog', post.id);
    log.info('Blog post created', { id: post.id, title: post.title });
    return post;
  }

  async update(id: string, data: { title?: string; content?: string; excerpt?: string; categoryId?: string; tags?: string; coverImage?: string }, userId: string) {
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundError('Blog post');
    if (post.authorId !== userId) throw new BadRequestError('Not authorized to edit this post');
    const updated = await prisma.blogPost.update({ where: { id }, data });
    await createAuditEntry(userId, 'BLOG_UPDATED', 'blog', id);
    return updated;
  }

  async publish(id: string, userId: string) {
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundError('Blog post');
    if (post.authorId !== userId) throw new BadRequestError('Not authorized');
    const published = await prisma.blogPost.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
    await eventBus.emit('blog.published', { type: 'blog.published', source: 'blog-service', data: { id }, userId });
    await createAuditEntry(userId, 'BLOG_PUBLISHED', 'blog', id);
    return published;
  }

  async unpublish(id: string, userId: string) {
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundError('Blog post');
    await prisma.blogPost.update({ where: { id }, data: { status: 'DRAFT' } });
    await createAuditEntry(userId, 'BLOG_UNPUBLISHED', 'blog', id);
  }

  async delete(id: string, userId: string) {
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundError('Blog post');
    await prisma.blogPost.delete({ where: { id } });
    await createAuditEntry(userId, 'BLOG_DELETED', 'blog', id);
  }

  async getCategories() {
    return prisma.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { posts: true } } } });
  }

  async createCategory(data: { name: string; slug: string; description?: string }, userId: string) {
    const cat = await prisma.category.create({ data: { name: data.name, slug: data.slug, description: data.description || null } });
    await createAuditEntry(userId, 'CATEGORY_CREATED', 'category', cat.id);
    return cat;
  }

  async getFeaturedPosts(limit: number) {
    return prisma.blogPost.findMany({ where: { status: 'PUBLISHED', isFeatured: true }, take: limit, orderBy: { publishedAt: 'desc' },
      include: { author: { select: { id: true, username: true, displayName: true, avatar: true } } } });
  }

  async toggleFeatured(id: string, userId: string) {
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundError('Blog post');
    await prisma.blogPost.update({ where: { id }, data: { isFeatured: !post.isFeatured } });
    await createAuditEntry(userId, 'BLOG_FEATURED_TOGGLED', 'blog', id);
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.BlogPostWhereInput = { status: 'PUBLISHED', OR: [{ title: { contains: query } }, { content: { contains: query } }, { tags: { contains: query } }] };
    const [data, total] = await Promise.all([
      prisma.blogPost.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { publishedAt: 'desc' },
        include: { author: { select: { id: true, username: true, displayName: true } } } }),
      prisma.blogPost.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }
}

export const blogService = new BlogService();