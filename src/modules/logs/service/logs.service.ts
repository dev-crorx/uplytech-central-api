// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('LogsService');

export class LogsService {
  async getLogs(params: PaginationParams, filters?: { level?: string; source?: string; startDate?: Date; endDate?: Date; search?: string }) {
    const where: Prisma.LogEntryWhereInput = {};
    if (filters?.level) where.level = filters.level;
    if (filters?.source) where.source = filters.source;
    if (filters?.search) where.message = { contains: filters.search };
    if (filters?.startDate || filters?.endDate) { where.timestamp = {}; if (filters.startDate) where.timestamp.gte = filters.startDate; if (filters.endDate) where.timestamp.lte = filters.endDate; }
    const [data, total] = await Promise.all([
      prisma.logEntry.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { timestamp: 'desc' } }),
      prisma.logEntry.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async create(data: { level: string; message: string; source: string; metadata?: object; stackTrace?: string; userId?: string }) {
    return prisma.logEntry.create({ data: { level: data.level, message: data.message, source: data.source,
      metadata: data.metadata || null, stackTrace: data.stackTrace || null, userId: data.userId || null, timestamp: new Date() } });
  }

  async getLevels() {
    const levels = await prisma.logEntry.groupBy({ by: ['level'], _count: true, orderBy: { _count: { level: 'desc' } } });
    return levels.map(l => ({ level: l.level, count: l._count }));
  }

  async getSources() {
    const sources = await prisma.logEntry.findMany({ select: { source: true }, distinct: ['source'], orderBy: { source: 'asc' } });
    return sources.map(s => s.source);
  }

  async purge(olderThan: Date, userId: string) {
    const result = await prisma.logEntry.deleteMany({ where: { timestamp: { lt: olderThan } } });
    await createAuditEntry(userId, 'LOGS_PURGED', 'logs', 'system', { deleted: result.count, olderThan: olderThan.toISOString() } as object);
    log.info('Logs purged', { deleted: result.count });
    return { deleted: result.count };
  }

  async getErrorRate(hours: number) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const [total, errors] = await Promise.all([
      prisma.logEntry.count({ where: { timestamp: { gte: since } } }),
      prisma.logEntry.count({ where: { timestamp: { gte: since }, level: 'ERROR' } }),
    ]);
    return { total, errors, rate: total > 0 ? (errors / total) * 100 : 0, hours };
  }
}

export const logsService = new LogsService();