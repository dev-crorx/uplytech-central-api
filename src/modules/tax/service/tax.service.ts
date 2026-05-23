import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('TaxService');

export class TaxService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.taxRecord.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.taxRecord.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.taxRecord.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Tax');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.taxRecord.create({ data: data as Prisma.TaxRecordCreateInput });
    await eventBus.emit('tax.created', { type: 'tax.created', source: 'tax-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'TAX_CREATED', 'tax', item.id);
    log.info('Tax created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.taxRecord.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Tax');
    const updated = await prisma.taxRecord.update({ where: { id }, data: data as Prisma.TaxRecordUpdateInput });
    await createAuditEntry(userId, 'TAX_UPDATED', 'tax', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.taxRecord.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Tax');
    await prisma.taxRecord.delete({ where: { id } });
    await createAuditEntry(userId, 'TAX_DELETED', 'tax', id);
    log.info('Tax deleted', { id });
  }
}

export const taxService = new TaxService();