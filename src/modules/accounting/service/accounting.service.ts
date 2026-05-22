import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('AccountingService');

export class AccountingService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.AccountingEntryWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.accountingEntry.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.AccountingEntryOrderByWithRelationInput,
        
      }),
      prisma.accountingEntry.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.accountingEntry.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('AccountingEntry');
    }

    return record;
  }

  async create(data: Prisma.AccountingEntryCreateInput, userId?: string) {
    
    
    

    const record = await prisma.accountingEntry.create({ data });

    await eventBus.emit('accounting.created', {
      type: 'accounting.created',
      source: 'accounting-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'accounting', record.id);

    log.info('AccountingEntry created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.AccountingEntryUpdateInput, userId?: string) {
    const existing = await prisma.accountingEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('AccountingEntry');
    }

    const record = await prisma.accountingEntry.update({
      where: { id },
      data,
    });

    await eventBus.emit('accounting.updated', {
      type: 'accounting.updated',
      source: 'accounting-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'accounting', id);

    log.info('AccountingEntry updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.accountingEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('AccountingEntry');
    }

    await prisma.accountingEntry.delete({ where: { id } });

    await eventBus.emit('accounting.deleted', {
      type: 'accounting.deleted',
      source: 'accounting-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'accounting', id);

    log.info('AccountingEntry deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.AccountingEntryWhereInput = {
      category: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.accountingEntry.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.accountingEntry.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const accountingService = new AccountingService();
