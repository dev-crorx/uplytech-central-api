import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('AccountingService');

export class AccountingService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.accountingEntry.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.accountingEntry.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.accountingEntry.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Accounting');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.accountingEntry.create({ data: data as Prisma.AccountingEntryCreateInput });
    await eventBus.emit('accounting.created', { type: 'accounting.created', source: 'accounting-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'ACCOUNTING_CREATED', 'accounting', item.id);
    log.info('Accounting created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.accountingEntry.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Accounting');
    const updated = await prisma.accountingEntry.update({ where: { id }, data: data as Prisma.AccountingEntryUpdateInput });
    await createAuditEntry(userId, 'ACCOUNTING_UPDATED', 'accounting', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.accountingEntry.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Accounting');
    await prisma.accountingEntry.delete({ where: { id } });
    await createAuditEntry(userId, 'ACCOUNTING_DELETED', 'accounting', id);
    log.info('Accounting deleted', { id });
  }
}

export const accountingService = new AccountingService();