import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('CommentsService');

export class CommentsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.CommentWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.CommentOrderByWithRelationInput,
        
      }),
      prisma.comment.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.comment.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Comment');
    }

    return record;
  }

  async create(data: Prisma.CommentCreateInput, userId?: string) {
    
    (data as Record<string, unknown>).author = { connect: { id: userId || '' } };
    

    const record = await prisma.comment.create({ data });

    await eventBus.emit('comments.created', {
      type: 'comments.created',
      source: 'comments-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'comments', record.id);

    log.info('Comment created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.CommentUpdateInput, userId?: string) {
    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Comment');
    }

    const record = await prisma.comment.update({
      where: { id },
      data,
    });

    await eventBus.emit('comments.updated', {
      type: 'comments.updated',
      source: 'comments-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'comments', id);

    log.info('Comment updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Comment');
    }

    await prisma.comment.delete({ where: { id } });

    await eventBus.emit('comments.deleted', {
      type: 'comments.deleted',
      source: 'comments-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'comments', id);

    log.info('Comment deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.CommentWhereInput = {
      content: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.comment.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const commentsService = new CommentsService();
