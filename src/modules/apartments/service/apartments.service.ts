import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ApartmentsService');

export class ApartmentsService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.apartment.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.apartment.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.apartment.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Apartments');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.apartment.create({ data: data as Prisma.ApartmentCreateInput });
    await eventBus.emit('apartments.created', { type: 'apartments.created', source: 'apartments-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'APARTMENTS_CREATED', 'apartments', item.id);
    log.info('Apartments created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.apartment.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Apartments');
    const updated = await prisma.apartment.update({ where: { id }, data: data as Prisma.ApartmentUpdateInput });
    await createAuditEntry(userId, 'APARTMENTS_UPDATED', 'apartments', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.apartment.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Apartments');
    await prisma.apartment.delete({ where: { id } });
    await createAuditEntry(userId, 'APARTMENTS_DELETED', 'apartments', id);
    log.info('Apartments deleted', { id });
  }
}

export const apartmentsService = new ApartmentsService();