import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('CommentsService');

export class CommentsService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.comment.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.comment.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.comment.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Comments');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.comment.create({ data: data as Prisma.CommentCreateInput });
    await eventBus.emit('comments.created', { type: 'comments.created', source: 'comments-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'COMMENTS_CREATED', 'comments', item.id);
    log.info('Comments created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.comment.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Comments');
    const updated = await prisma.comment.update({ where: { id }, data: data as Prisma.CommentUpdateInput });
    await createAuditEntry(userId, 'COMMENTS_UPDATED', 'comments', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.comment.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Comments');
    await prisma.comment.delete({ where: { id } });
    await createAuditEntry(userId, 'COMMENTS_DELETED', 'comments', id);
    log.info('Comments deleted', { id });
  }
}

export const commentsService = new CommentsService();