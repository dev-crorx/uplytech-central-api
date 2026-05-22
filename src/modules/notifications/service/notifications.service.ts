// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('NotificationsService');

export class NotificationsService {
  async getAll(userId: string, params: PaginationParams, unreadOnly?: boolean) {
    const where: Prisma.NotificationWhereInput = { userId };
    if (unreadOnly) where.isRead = false;
    const [data, total] = await Promise.all([
      prisma.notification.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async create(data: { userId: string; type: string; title: string; message: string; actionUrl?: string; metadata?: object }) {
    const notif = await prisma.notification.create({
      data: { userId: data.userId, type: data.type, title: data.title, message: data.message, actionUrl: data.actionUrl || null, metadata: data.metadata || null },
    });
    await eventBus.emit('notifications.created', { type: 'notifications.created', source: 'notifications-service', data: { id: notif.id, userId: data.userId } });
    return notif;
  }

  async markAsRead(id: string, userId: string) {
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) throw new NotFoundError('Notification');
    await prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
  }

  async delete(id: string, userId: string) {
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) throw new NotFoundError('Notification');
    await prisma.notification.delete({ where: { id } });
  }

  async deleteAll(userId: string) {
    await prisma.notification.deleteMany({ where: { userId } });
  }

  async getUnreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }

  async sendBulk(userIds: string[], type: string, title: string, message: string) {
    const data = userIds.map(userId => ({ userId, type, title, message }));
    await prisma.notification.createMany({ data });
    log.info('Bulk notifications sent', { count: userIds.length, type });
    return { sent: userIds.length };
  }
}

export const notificationsService = new NotificationsService();