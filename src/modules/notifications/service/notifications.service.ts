import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('NotificationsService');

export class NotificationsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.NotificationWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.NotificationOrderByWithRelationInput,
        
      }),
      prisma.notification.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.notification.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Notification');
    }

    return record;
  }

  async create(data: Prisma.NotificationCreateInput, userId?: string) {
    
    
    

    const record = await prisma.notification.create({ data });

    await eventBus.emit('notifications.created', {
      type: 'notifications.created',
      source: 'notifications-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'notifications', record.id);

    log.info('Notification created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.NotificationUpdateInput, userId?: string) {
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Notification');
    }

    const record = await prisma.notification.update({
      where: { id },
      data,
    });

    await eventBus.emit('notifications.updated', {
      type: 'notifications.updated',
      source: 'notifications-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'notifications', id);

    log.info('Notification updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Notification');
    }

    await prisma.notification.delete({ where: { id } });

    await eventBus.emit('notifications.deleted', {
      type: 'notifications.deleted',
      source: 'notifications-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'notifications', id);

    log.info('Notification deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.NotificationWhereInput = {
      title: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const notificationsService = new NotificationsService();
