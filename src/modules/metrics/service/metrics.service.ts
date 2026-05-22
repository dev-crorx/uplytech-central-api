// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('MetricsService');

export class MetricsService {
  async record(data: { name: string; value: number; unit?: string; tags?: object; source?: string }) {
    return prisma.metric.create({ data: { name: data.name, value: data.value, unit: data.unit || null, tags: data.tags || null, source: data.source || 'system' } });
  }

  async getMetrics(params: PaginationParams, filters?: { name?: string; source?: string; startDate?: Date; endDate?: Date }) {
    const where: Prisma.MetricWhereInput = {};
    if (filters?.name) where.name = filters.name;
    if (filters?.source) where.source = filters.source;
    if (filters?.startDate || filters?.endDate) { where.createdAt = {}; if (filters.startDate) where.createdAt.gte = filters.startDate; if (filters.endDate) where.createdAt.lte = filters.endDate; }
    const [data, total] = await Promise.all([
      prisma.metric.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.metric.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getAggregated(name: string, aggregation: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.MetricWhereInput = { name };
    if (startDate || endDate) { where.createdAt = {}; if (startDate) where.createdAt.gte = startDate; if (endDate) where.createdAt.lte = endDate; }
    const result = await prisma.metric.aggregate({ where, _avg: { value: true }, _min: { value: true }, _max: { value: true }, _sum: { value: true }, _count: true });
    return { name, aggregation, avg: result._avg.value, min: result._min.value, max: result._max.value, sum: result._sum.value, count: result._count };
  }

  async getNames() {
    const metrics = await prisma.metric.findMany({ select: { name: true }, distinct: ['name'], orderBy: { name: 'asc' } });
    return metrics.map(m => m.name);
  }

  async getSystemMetrics() {
    const uptime = process.uptime();
    const mem = process.memoryUsage();
    return { uptime, memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal }, pid: process.pid, nodeVersion: process.version };
  }

  async recordBatch(metrics: Array<{ name: string; value: number; unit?: string; tags?: object; source?: string }>) {
    const data = metrics.map(m => ({ name: m.name, value: m.value, unit: m.unit || null, tags: m.tags || null, source: m.source || 'system' }));
    await prisma.metric.createMany({ data });
    return { recorded: data.length };
  }
}

export const metricsService = new MetricsService();