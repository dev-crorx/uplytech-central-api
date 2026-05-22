// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('BroadcastsService');

export class BroadcastsService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.broadcast.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.broadcast.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.broadcast.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Broadcasts');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.broadcast.create({ data: data as Prisma.BroadcastCreateInput });
    await eventBus.emit('broadcasts.created', { type: 'broadcasts.created', source: 'broadcasts-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'BROADCASTS_CREATED', 'broadcasts', item.id);
    log.info('Broadcasts created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.broadcast.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Broadcasts');
    const updated = await prisma.broadcast.update({ where: { id }, data: data as Prisma.BroadcastUpdateInput });
    await createAuditEntry(userId, 'BROADCASTS_UPDATED', 'broadcasts', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.broadcast.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Broadcasts');
    await prisma.broadcast.delete({ where: { id } });
    await createAuditEntry(userId, 'BROADCASTS_DELETED', 'broadcasts', id);
    log.info('Broadcasts deleted', { id });
  }
}

export const broadcastsService = new BroadcastsService();