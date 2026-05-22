// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('SubscriptionsService');

export class SubscriptionsService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.subscription.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.subscription.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.subscription.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Subscriptions');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.subscription.create({ data: data as Prisma.SubscriptionCreateInput });
    await eventBus.emit('subscriptions.created', { type: 'subscriptions.created', source: 'subscriptions-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'SUBSCRIPTIONS_CREATED', 'subscriptions', item.id);
    log.info('Subscriptions created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.subscription.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Subscriptions');
    const updated = await prisma.subscription.update({ where: { id }, data: data as Prisma.SubscriptionUpdateInput });
    await createAuditEntry(userId, 'SUBSCRIPTIONS_UPDATED', 'subscriptions', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.subscription.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Subscriptions');
    await prisma.subscription.delete({ where: { id } });
    await createAuditEntry(userId, 'SUBSCRIPTIONS_DELETED', 'subscriptions', id);
    log.info('Subscriptions deleted', { id });
  }
}

export const subscriptionsService = new SubscriptionsService();