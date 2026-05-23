import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('AreasService');

export class AreasService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.area.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.area.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.area.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Areas');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.area.create({ data: data as Prisma.AreaCreateInput });
    await eventBus.emit('areas.created', { type: 'areas.created', source: 'areas-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'AREAS_CREATED', 'areas', item.id);
    log.info('Areas created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.area.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Areas');
    const updated = await prisma.area.update({ where: { id }, data: data as Prisma.AreaUpdateInput });
    await createAuditEntry(userId, 'AREAS_UPDATED', 'areas', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.area.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Areas');
    await prisma.area.delete({ where: { id } });
    await createAuditEntry(userId, 'AREAS_DELETED', 'areas', id);
    log.info('Areas deleted', { id });
  }
}

export const areasService = new AreasService();