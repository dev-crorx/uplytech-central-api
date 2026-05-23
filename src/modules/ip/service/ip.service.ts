import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('IpService');

export class IpService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.ipEntry.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.ipEntry.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.ipEntry.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Ip');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.ipEntry.create({ data: data as Prisma.IpEntryCreateInput });
    await eventBus.emit('ip.created', { type: 'ip.created', source: 'ip-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'IP_CREATED', 'ip', item.id);
    log.info('Ip created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.ipEntry.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Ip');
    const updated = await prisma.ipEntry.update({ where: { id }, data: data as Prisma.IpEntryUpdateInput });
    await createAuditEntry(userId, 'IP_UPDATED', 'ip', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.ipEntry.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Ip');
    await prisma.ipEntry.delete({ where: { id } });
    await createAuditEntry(userId, 'IP_DELETED', 'ip', id);
    log.info('Ip deleted', { id });
  }
}

export const ipService = new IpService();