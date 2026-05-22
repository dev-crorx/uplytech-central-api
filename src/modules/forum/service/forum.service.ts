// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ForumService');

export class ForumService {
  async getCategories() {
    return prisma.forumCategory.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { posts: true } } } });
  }

  async createCategory(data: { name: string; slug: string; description?: string; sortOrder?: number }, userId: string) {
    const cat = await prisma.forumCategory.create({ data: { name: data.name, slug: data.slug, description: data.description || null, sortOrder: data.sortOrder || 0 } });
    await createAuditEntry(userId, 'FORUM_CATEGORY_CREATED', 'forum', cat.id);
    return cat;
  }

  async getPosts(params: PaginationParams, filters?: { categoryId?: string; isPinned?: boolean; isLocked?: boolean }) {
    const where: Prisma.ForumPostWhereInput = {};
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.isPinned !== undefined) where.isPinned = filters.isPinned;
    if (filters?.isLocked !== undefined) where.isLocked = filters.isLocked;
    const [data, total] = await Promise.all([
      prisma.forumPost.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit,
        orderBy: [{ isPinned: 'desc' }, { lastReplyAt: 'desc' }],
        include: { author: { select: { id: true, username: true, displayName: true, avatar: true } }, category: { select: { id: true, name: true } }, _count: { select: { replies: true } } } }),
      prisma.forumPost.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getPost(id: string) {
    const post = await prisma.forumPost.findUnique({ where: { id },
      include: { author: { select: { id: true, username: true, displayName: true, avatar: true } }, category: true, replies: { orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, username: true, displayName: true, avatar: true } } } } } });
    if (!post) throw new NotFoundError('Forum post');
    await prisma.forumPost.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return post;
  }

  async createPost(data: { title: string; content: string; categoryId: string; tags?: string }, userId: string) {
    const post = await prisma.forumPost.create({
      data: { title: data.title, content: data.content, categoryId: data.categoryId, tags: data.tags || null, authorId: userId, lastReplyAt: new Date() },
    });
    await eventBus.emit('forum.post_created', { type: 'forum.post_created', source: 'forum-service', data: { id: post.id }, userId });
    await createAuditEntry(userId, 'FORUM_POST_CREATED', 'forum', post.id);
    log.info('Forum post created', { id: post.id });
    return post;
  }

  async updatePost(id: string, data: { title?: string; content?: string; tags?: string }, userId: string) {
    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundError('Forum post');
    if (post.authorId !== userId) throw new BadRequestError('Not authorized to edit this post');
    if (post.isLocked) throw new BadRequestError('Post is locked');
    return prisma.forumPost.update({ where: { id }, data });
  }

  async deletePost(id: string, userId: string) {
    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundError('Forum post');
    await prisma.forumReply.deleteMany({ where: { postId: id } });
    await prisma.forumPost.delete({ where: { id } });
    await createAuditEntry(userId, 'FORUM_POST_DELETED', 'forum', id);
  }

  async createReply(postId: string, content: string, userId: string) {
    const post = await prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundError('Forum post');
    if (post.isLocked) throw new BadRequestError('Post is locked, cannot reply');
    const reply = await prisma.forumReply.create({
      data: { postId, content, authorId: userId },
      include: { author: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });
    await prisma.forumPost.update({ where: { id: postId }, data: { lastReplyAt: new Date() } });
    await eventBus.emit('forum.reply_created', { type: 'forum.reply_created', source: 'forum-service', data: { postId, replyId: reply.id }, userId });
    return reply;
  }

  async deleteReply(replyId: string, userId: string) {
    const reply = await prisma.forumReply.findUnique({ where: { id: replyId } });
    if (!reply) throw new NotFoundError('Reply');
    if (reply.authorId !== userId) throw new BadRequestError('Not authorized');
    await prisma.forumReply.delete({ where: { id: replyId } });
  }

  async pinPost(id: string, userId: string) {
    await prisma.forumPost.update({ where: { id }, data: { isPinned: true } });
    await createAuditEntry(userId, 'FORUM_POST_PINNED', 'forum', id);
  }

  async unpinPost(id: string, userId: string) {
    await prisma.forumPost.update({ where: { id }, data: { isPinned: false } });
    await createAuditEntry(userId, 'FORUM_POST_UNPINNED', 'forum', id);
  }

  async lockPost(id: string, userId: string) {
    await prisma.forumPost.update({ where: { id }, data: { isLocked: true } });
    await createAuditEntry(userId, 'FORUM_POST_LOCKED', 'forum', id);
  }

  async unlockPost(id: string, userId: string) {
    await prisma.forumPost.update({ where: { id }, data: { isLocked: false } });
    await createAuditEntry(userId, 'FORUM_POST_UNLOCKED', 'forum', id);
  }

  async movePost(id: string, categoryId: string, userId: string) {
    await prisma.forumPost.update({ where: { id }, data: { categoryId } });
    await createAuditEntry(userId, 'FORUM_POST_MOVED', 'forum', id, { categoryId } as object);
  }

  async searchPosts(query: string, params: PaginationParams) {
    const where: Prisma.ForumPostWhereInput = { OR: [{ title: { contains: query } }, { content: { contains: query } }] };
    const [data, total] = await Promise.all([
      prisma.forumPost.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { lastReplyAt: 'desc' },
        include: { author: { select: { id: true, username: true } }, category: { select: { name: true } }, _count: { select: { replies: true } } } }),
      prisma.forumPost.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }
}

export const forumService = new ForumService();