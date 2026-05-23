// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('DownloadsService');

export class DownloadsService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.download.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.download.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.download.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Downloads');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.download.create({ data: data as Prisma.DownloadCreateInput });
    await eventBus.emit('downloads.created', { type: 'downloads.created', source: 'downloads-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'DOWNLOADS_CREATED', 'downloads', item.id);
    log.info('Downloads created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.download.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Downloads');
    const updated = await prisma.download.update({ where: { id }, data: data as Prisma.DownloadUpdateInput });
    await createAuditEntry(userId, 'DOWNLOADS_UPDATED', 'downloads', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.download.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Downloads');
    await prisma.download.delete({ where: { id } });
    await createAuditEntry(userId, 'DOWNLOADS_DELETED', 'downloads', id);
    log.info('Downloads deleted', { id });
  }
}

export const downloadsService = new DownloadsService();