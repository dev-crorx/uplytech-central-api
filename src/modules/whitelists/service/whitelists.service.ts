// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('WhitelistsService');

export class WhitelistsService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.whitelistEntry.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.whitelistEntry.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.whitelistEntry.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Whitelists');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.whitelistEntry.create({ data: data as Prisma.WhitelistEntryCreateInput });
    await eventBus.emit('whitelists.created', { type: 'whitelists.created', source: 'whitelists-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'WHITELISTS_CREATED', 'whitelists', item.id);
    log.info('Whitelists created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.whitelistEntry.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Whitelists');
    const updated = await prisma.whitelistEntry.update({ where: { id }, data: data as Prisma.WhitelistEntryUpdateInput });
    await createAuditEntry(userId, 'WHITELISTS_UPDATED', 'whitelists', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.whitelistEntry.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Whitelists');
    await prisma.whitelistEntry.delete({ where: { id } });
    await createAuditEntry(userId, 'WHITELISTS_DELETED', 'whitelists', id);
    log.info('Whitelists deleted', { id });
  }
}

export const whitelistsService = new WhitelistsService();