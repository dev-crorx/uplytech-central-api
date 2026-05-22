import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('MetricsService');

export class MetricsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.MetricWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.metric.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.MetricOrderByWithRelationInput,
        
      }),
      prisma.metric.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.metric.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Metric');
    }

    return record;
  }

  async create(data: Prisma.MetricCreateInput, userId?: string) {
    
    
    

    const record = await prisma.metric.create({ data });

    await eventBus.emit('metrics.created', {
      type: 'metrics.created',
      source: 'metrics-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'metrics', record.id);

    log.info('Metric created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.MetricUpdateInput, userId?: string) {
    const existing = await prisma.metric.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Metric');
    }

    const record = await prisma.metric.update({
      where: { id },
      data,
    });

    await eventBus.emit('metrics.updated', {
      type: 'metrics.updated',
      source: 'metrics-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'metrics', id);

    log.info('Metric updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.metric.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Metric');
    }

    await prisma.metric.delete({ where: { id } });

    await eventBus.emit('metrics.deleted', {
      type: 'metrics.deleted',
      source: 'metrics-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'metrics', id);

    log.info('Metric deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.MetricWhereInput = {
      name: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.metric.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { id: 'desc' },
      }),
      prisma.metric.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const metricsService = new MetricsService();
