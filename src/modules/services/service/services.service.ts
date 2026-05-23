import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ServicesService');

export class ServicesService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.service.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.service.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.service.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Services');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.service.create({ data: data as Prisma.ServiceCreateInput });
    await eventBus.emit('services.created', { type: 'services.created', source: 'services-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'SERVICES_CREATED', 'services', item.id);
    log.info('Services created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.service.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Services');
    const updated = await prisma.service.update({ where: { id }, data: data as Prisma.ServiceUpdateInput });
    await createAuditEntry(userId, 'SERVICES_UPDATED', 'services', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.service.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Services');
    await prisma.service.delete({ where: { id } });
    await createAuditEntry(userId, 'SERVICES_DELETED', 'services', id);
    log.info('Services deleted', { id });
  }
}

export const servicesService = new ServicesService();