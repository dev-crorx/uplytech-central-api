// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('FinanceService');

export class FinanceService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.financialReport.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.financialReport.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.financialReport.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Finance');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.financialReport.create({ data: data as Prisma.FinancialReportCreateInput });
    await eventBus.emit('finance.created', { type: 'finance.created', source: 'finance-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'FINANCE_CREATED', 'finance', item.id);
    log.info('Finance created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.financialReport.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Finance');
    const updated = await prisma.financialReport.update({ where: { id }, data: data as Prisma.FinancialReportUpdateInput });
    await createAuditEntry(userId, 'FINANCE_UPDATED', 'finance', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.financialReport.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Finance');
    await prisma.financialReport.delete({ where: { id } });
    await createAuditEntry(userId, 'FINANCE_DELETED', 'finance', id);
    log.info('Finance deleted', { id });
  }
}

export const financeService = new FinanceService();