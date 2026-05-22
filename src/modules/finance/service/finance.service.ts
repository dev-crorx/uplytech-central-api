import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('FinanceService');

export class FinanceService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.FinancialReportWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.financialReport.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.FinancialReportOrderByWithRelationInput,
        
      }),
      prisma.financialReport.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.financialReport.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('FinancialReport');
    }

    return record;
  }

  async create(data: Prisma.FinancialReportCreateInput, userId?: string) {
    
    
    

    const record = await prisma.financialReport.create({ data });

    await eventBus.emit('finance.created', {
      type: 'finance.created',
      source: 'finance-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'finance', record.id);

    log.info('FinancialReport created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.FinancialReportUpdateInput, userId?: string) {
    const existing = await prisma.financialReport.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('FinancialReport');
    }

    const record = await prisma.financialReport.update({
      where: { id },
      data,
    });

    await eventBus.emit('finance.updated', {
      type: 'finance.updated',
      source: 'finance-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'finance', id);

    log.info('FinancialReport updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.financialReport.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('FinancialReport');
    }

    await prisma.financialReport.delete({ where: { id } });

    await eventBus.emit('finance.deleted', {
      type: 'finance.deleted',
      source: 'finance-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'finance', id);

    log.info('FinancialReport deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.FinancialReportWhereInput = {
      type: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.financialReport.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.financialReport.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const financeService = new FinanceService();
