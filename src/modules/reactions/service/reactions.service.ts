// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ReactionsService');

export class ReactionsService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.reaction.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.reaction.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.reaction.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Reactions');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.reaction.create({ data: data as Prisma.ReactionCreateInput });
    await eventBus.emit('reactions.created', { type: 'reactions.created', source: 'reactions-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'REACTIONS_CREATED', 'reactions', item.id);
    log.info('Reactions created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.reaction.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Reactions');
    const updated = await prisma.reaction.update({ where: { id }, data: data as Prisma.ReactionUpdateInput });
    await createAuditEntry(userId, 'REACTIONS_UPDATED', 'reactions', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.reaction.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Reactions');
    await prisma.reaction.delete({ where: { id } });
    await createAuditEntry(userId, 'REACTIONS_DELETED', 'reactions', id);
    log.info('Reactions deleted', { id });
  }
}

export const reactionsService = new ReactionsService();