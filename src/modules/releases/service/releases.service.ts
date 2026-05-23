import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ReleasesService');

export class ReleasesService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.release.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.release.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.release.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Releases');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.release.create({ data: data as Prisma.ReleaseCreateInput });
    await eventBus.emit('releases.created', { type: 'releases.created', source: 'releases-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'RELEASES_CREATED', 'releases', item.id);
    log.info('Releases created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.release.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Releases');
    const updated = await prisma.release.update({ where: { id }, data: data as Prisma.ReleaseUpdateInput });
    await createAuditEntry(userId, 'RELEASES_UPDATED', 'releases', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.release.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Releases');
    await prisma.release.delete({ where: { id } });
    await createAuditEntry(userId, 'RELEASES_DELETED', 'releases', id);
    log.info('Releases deleted', { id });
  }
}

export const releasesService = new ReleasesService();