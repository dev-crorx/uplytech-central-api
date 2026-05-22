import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('TaxService');

export class TaxService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.TaxRecordWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.taxRecord.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.TaxRecordOrderByWithRelationInput,
        
      }),
      prisma.taxRecord.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.taxRecord.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('TaxRecord');
    }

    return record;
  }

  async create(data: Prisma.TaxRecordCreateInput, userId?: string) {
    
    
    

    const record = await prisma.taxRecord.create({ data });

    await eventBus.emit('tax.created', {
      type: 'tax.created',
      source: 'tax-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'tax', record.id);

    log.info('TaxRecord created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.TaxRecordUpdateInput, userId?: string) {
    const existing = await prisma.taxRecord.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('TaxRecord');
    }

    const record = await prisma.taxRecord.update({
      where: { id },
      data,
    });

    await eventBus.emit('tax.updated', {
      type: 'tax.updated',
      source: 'tax-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'tax', id);

    log.info('TaxRecord updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.taxRecord.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('TaxRecord');
    }

    await prisma.taxRecord.delete({ where: { id } });

    await eventBus.emit('tax.deleted', {
      type: 'tax.deleted',
      source: 'tax-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'tax', id);

    log.info('TaxRecord deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.TaxRecordWhereInput = {
      period: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.taxRecord.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.taxRecord.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const taxService = new TaxService();
