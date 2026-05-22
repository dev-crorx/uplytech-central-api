import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('EconomyService');

export class EconomyService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.EconomyAccountWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.economyAccount.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.EconomyAccountOrderByWithRelationInput,
        
      }),
      prisma.economyAccount.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.economyAccount.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('EconomyAccount');
    }

    return record;
  }

  async create(data: Prisma.EconomyAccountCreateInput, userId?: string) {
    
    
    

    const record = await prisma.economyAccount.create({ data });

    await eventBus.emit('economy.created', {
      type: 'economy.created',
      source: 'economy-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'economy', record.id);

    log.info('EconomyAccount created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.EconomyAccountUpdateInput, userId?: string) {
    const existing = await prisma.economyAccount.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('EconomyAccount');
    }

    const record = await prisma.economyAccount.update({
      where: { id },
      data,
    });

    await eventBus.emit('economy.updated', {
      type: 'economy.updated',
      source: 'economy-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'economy', id);

    log.info('EconomyAccount updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.economyAccount.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('EconomyAccount');
    }

    await prisma.economyAccount.delete({ where: { id } });

    await eventBus.emit('economy.deleted', {
      type: 'economy.deleted',
      source: 'economy-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'economy', id);

    log.info('EconomyAccount deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.EconomyAccountWhereInput = {
      currency: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.economyAccount.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.economyAccount.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const economyService = new EconomyService();
