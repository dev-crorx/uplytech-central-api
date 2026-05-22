import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ForumService');

export class ForumService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.ForumPostWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.ForumPostOrderByWithRelationInput,
        include: { author: { select: { id: true, username: true, displayName: true, avatar: true } }, category: true, replies: { take: 20, orderBy: { createdAt: 'asc' } } }
      }),
      prisma.forumPost.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.forumPost.findUnique({
      where: { id },
      include: { author: { select: { id: true, username: true, displayName: true, avatar: true } }, category: true, replies: { take: 20, orderBy: { createdAt: 'asc' } } }
    });

    if (!record) {
      throw new NotFoundError('ForumPost');
    }

    return record;
  }

  async create(data: Prisma.ForumPostCreateInput, userId?: string) {
    
    (data as Record<string, unknown>).author = { connect: { id: userId || '' } };
    

    const record = await prisma.forumPost.create({ data });

    await eventBus.emit('forum.created', {
      type: 'forum.created',
      source: 'forum-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'forum', record.id);

    log.info('ForumPost created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.ForumPostUpdateInput, userId?: string) {
    const existing = await prisma.forumPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('ForumPost');
    }

    const record = await prisma.forumPost.update({
      where: { id },
      data,
    });

    await eventBus.emit('forum.updated', {
      type: 'forum.updated',
      source: 'forum-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'forum', id);

    log.info('ForumPost updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.forumPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('ForumPost');
    }

    await prisma.forumPost.delete({ where: { id } });

    await eventBus.emit('forum.deleted', {
      type: 'forum.deleted',
      source: 'forum-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'forum', id);

    log.info('ForumPost deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.ForumPostWhereInput = {
      title: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.forumPost.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const forumService = new ForumService();
