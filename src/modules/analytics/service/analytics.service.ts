import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('AnalyticsService');

export class AnalyticsService {
  async trackEvent(data: { event: string; userId?: string; sessionId?: string; properties?: object; source?: string; ip?: string; userAgent?: string }) {
    return prisma.analyticsEvent.create({ data: { event: data.event, userId: data.userId || null, sessionId: data.sessionId || null,
      properties: data.properties || undefined, source: data.source || 'web', ip: data.ip || null, userAgent: data.userAgent || null } });
  }

  async getEvents(params: PaginationParams, filters?: { event?: string; userId?: string; source?: string; startDate?: Date; endDate?: Date }) {
    const where: Prisma.AnalyticsEventWhereInput = {};
    if (filters?.event) where.event = filters.event;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.source) where.source = filters.source;
    if (filters?.startDate || filters?.endDate) { where.createdAt = {}; if (filters.startDate) where.createdAt.gte = filters.startDate; if (filters.endDate) where.createdAt.lte = filters.endDate; }
    const [data, total] = await Promise.all([
      prisma.analyticsEvent.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.analyticsEvent.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getEventCounts(event: string, groupBy: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.AnalyticsEventWhereInput = { event };
    if (startDate || endDate) { where.createdAt = {}; if (startDate) where.createdAt.gte = startDate; if (endDate) where.createdAt.lte = endDate; }
    const total = await prisma.analyticsEvent.count({ where });
    return { event, total, groupBy };
  }

  async getUniqueUsers(startDate?: Date, endDate?: Date) {
    const where: Prisma.AnalyticsEventWhereInput = { userId: { not: null } };
    if (startDate || endDate) { where.createdAt = {}; if (startDate) where.createdAt.gte = startDate; if (endDate) where.createdAt.lte = endDate; }
    const events = await prisma.analyticsEvent.findMany({ where, select: { userId: true }, distinct: ['userId'] });
    return { uniqueUsers: events.length };
  }

  async getTopEvents(limit: number, startDate?: Date, endDate?: Date) {
    const where: Prisma.AnalyticsEventWhereInput = {};
    if (startDate || endDate) { where.createdAt = {}; if (startDate) where.createdAt.gte = startDate; if (endDate) where.createdAt.lte = endDate; }
    const events = await prisma.analyticsEvent.groupBy({ by: ['event'], where, _count: true, orderBy: { _count: { event: 'desc' } }, take: limit });
    return events.map(e => ({ event: e.event, count: e._count }));
  }

  async getDashboard() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [todayEvents, weekEvents, totalEvents, totalUsers] = await Promise.all([
      prisma.analyticsEvent.count({ where: { createdAt: { gte: today } } }),
      prisma.analyticsEvent.count({ where: { createdAt: { gte: thisWeek } } }),
      prisma.analyticsEvent.count(),
      prisma.user.count(),
    ]);
    return { todayEvents, weekEvents, totalEvents, totalUsers };
  }
}

export const analyticsService = new AnalyticsService();