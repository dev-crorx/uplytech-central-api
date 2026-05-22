// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ScansService');

export class ScansService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.contentScan.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.contentScan.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.contentScan.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Scans');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.contentScan.create({ data: data as Prisma.ContentScanCreateInput });
    await eventBus.emit('scans.created', { type: 'scans.created', source: 'scans-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'SCANS_CREATED', 'scans', item.id);
    log.info('Scans created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.contentScan.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Scans');
    const updated = await prisma.contentScan.update({ where: { id }, data: data as Prisma.ContentScanUpdateInput });
    await createAuditEntry(userId, 'SCANS_UPDATED', 'scans', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.contentScan.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Scans');
    await prisma.contentScan.delete({ where: { id } });
    await createAuditEntry(userId, 'SCANS_DELETED', 'scans', id);
    log.info('Scans deleted', { id });
  }
}

export const scansService = new ScansService();