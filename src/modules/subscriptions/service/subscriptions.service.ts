import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('SubscriptionsService');

export class SubscriptionsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.SubscriptionWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.SubscriptionOrderByWithRelationInput,
        
      }),
      prisma.subscription.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.subscription.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Subscription');
    }

    return record;
  }

  async create(data: Prisma.SubscriptionCreateInput, userId?: string) {
    
    
    

    const record = await prisma.subscription.create({ data });

    await eventBus.emit('subscriptions.created', {
      type: 'subscriptions.created',
      source: 'subscriptions-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'subscriptions', record.id);

    log.info('Subscription created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.SubscriptionUpdateInput, userId?: string) {
    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Subscription');
    }

    const record = await prisma.subscription.update({
      where: { id },
      data,
    });

    await eventBus.emit('subscriptions.updated', {
      type: 'subscriptions.updated',
      source: 'subscriptions-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'subscriptions', id);

    log.info('Subscription updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Subscription');
    }

    await prisma.subscription.delete({ where: { id } });

    await eventBus.emit('subscriptions.deleted', {
      type: 'subscriptions.deleted',
      source: 'subscriptions-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'subscriptions', id);

    log.info('Subscription deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.SubscriptionWhereInput = {
      userId: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.subscription.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const subscriptionsService = new SubscriptionsService();
