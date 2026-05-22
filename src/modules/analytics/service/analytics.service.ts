import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('AnalyticsService');

export class AnalyticsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.AnalyticsEventWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.AnalyticsEventOrderByWithRelationInput,
        
      }),
      prisma.analyticsEvent.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.analyticsEvent.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('AnalyticsEvent');
    }

    return record;
  }

  async create(data: Prisma.AnalyticsEventCreateInput, userId?: string) {
    
    
    

    const record = await prisma.analyticsEvent.create({ data });

    await eventBus.emit('analytics.created', {
      type: 'analytics.created',
      source: 'analytics-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'analytics', record.id);

    log.info('AnalyticsEvent created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.AnalyticsEventUpdateInput, userId?: string) {
    const existing = await prisma.analyticsEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('AnalyticsEvent');
    }

    const record = await prisma.analyticsEvent.update({
      where: { id },
      data,
    });

    await eventBus.emit('analytics.updated', {
      type: 'analytics.updated',
      source: 'analytics-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'analytics', id);

    log.info('AnalyticsEvent updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.analyticsEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('AnalyticsEvent');
    }

    await prisma.analyticsEvent.delete({ where: { id } });

    await eventBus.emit('analytics.deleted', {
      type: 'analytics.deleted',
      source: 'analytics-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'analytics', id);

    log.info('AnalyticsEvent deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.AnalyticsEventWhereInput = {
      event: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { id: 'desc' },
      }),
      prisma.analyticsEvent.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const analyticsService = new AnalyticsService();
