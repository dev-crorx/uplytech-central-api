import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('AlertsService');

export class AlertsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.AlertWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.AlertOrderByWithRelationInput,
        
      }),
      prisma.alert.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.alert.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Alert');
    }

    return record;
  }

  async create(data: Prisma.AlertCreateInput, userId?: string) {
    
    
    

    const record = await prisma.alert.create({ data });

    await eventBus.emit('alerts.created', {
      type: 'alerts.created',
      source: 'alerts-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'alerts', record.id);

    log.info('Alert created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.AlertUpdateInput, userId?: string) {
    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Alert');
    }

    const record = await prisma.alert.update({
      where: { id },
      data,
    });

    await eventBus.emit('alerts.updated', {
      type: 'alerts.updated',
      source: 'alerts-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'alerts', id);

    log.info('Alert updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Alert');
    }

    await prisma.alert.delete({ where: { id } });

    await eventBus.emit('alerts.deleted', {
      type: 'alerts.deleted',
      source: 'alerts-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'alerts', id);

    log.info('Alert deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.AlertWhereInput = {
      title: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.alert.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const alertsService = new AlertsService();
