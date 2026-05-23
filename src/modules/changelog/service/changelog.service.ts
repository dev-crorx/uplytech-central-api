// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ChangelogService');

export class ChangelogService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.changelog.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.changelog.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.changelog.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Changelog');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.changelog.create({ data: data as Prisma.ChangelogCreateInput });
    await eventBus.emit('changelog.created', { type: 'changelog.created', source: 'changelog-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'CHANGELOG_CREATED', 'changelog', item.id);
    log.info('Changelog created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.changelog.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Changelog');
    const updated = await prisma.changelog.update({ where: { id }, data: data as Prisma.ChangelogUpdateInput });
    await createAuditEntry(userId, 'CHANGELOG_UPDATED', 'changelog', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.changelog.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Changelog');
    await prisma.changelog.delete({ where: { id } });
    await createAuditEntry(userId, 'CHANGELOG_DELETED', 'changelog', id);
    log.info('Changelog deleted', { id });
  }
}

export const changelogService = new ChangelogService();