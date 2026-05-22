// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ArchiveService');

export class ArchiveService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.archive.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.archive.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.archive.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Archive');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.archive.create({ data: data as Prisma.ArchiveCreateInput });
    await eventBus.emit('archive.created', { type: 'archive.created', source: 'archive-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'ARCHIVE_CREATED', 'archive', item.id);
    log.info('Archive created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.archive.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Archive');
    const updated = await prisma.archive.update({ where: { id }, data: data as Prisma.ArchiveUpdateInput });
    await createAuditEntry(userId, 'ARCHIVE_UPDATED', 'archive', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.archive.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Archive');
    await prisma.archive.delete({ where: { id } });
    await createAuditEntry(userId, 'ARCHIVE_DELETED', 'archive', id);
    log.info('Archive deleted', { id });
  }
}

export const archiveService = new ArchiveService();