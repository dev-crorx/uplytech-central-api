import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('WhitelistsService');

export class WhitelistsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.WhitelistEntryWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.whitelistEntry.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.WhitelistEntryOrderByWithRelationInput,
        
      }),
      prisma.whitelistEntry.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.whitelistEntry.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('WhitelistEntry');
    }

    return record;
  }

  async create(data: Prisma.WhitelistEntryCreateInput, userId?: string) {
    
    
    

    const record = await prisma.whitelistEntry.create({ data });

    await eventBus.emit('whitelists.created', {
      type: 'whitelists.created',
      source: 'whitelists-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'whitelists', record.id);

    log.info('WhitelistEntry created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.WhitelistEntryUpdateInput, userId?: string) {
    const existing = await prisma.whitelistEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('WhitelistEntry');
    }

    const record = await prisma.whitelistEntry.update({
      where: { id },
      data,
    });

    await eventBus.emit('whitelists.updated', {
      type: 'whitelists.updated',
      source: 'whitelists-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'whitelists', id);

    log.info('WhitelistEntry updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.whitelistEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('WhitelistEntry');
    }

    await prisma.whitelistEntry.delete({ where: { id } });

    await eventBus.emit('whitelists.deleted', {
      type: 'whitelists.deleted',
      source: 'whitelists-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'whitelists', id);

    log.info('WhitelistEntry deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.WhitelistEntryWhereInput = {
      value: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.whitelistEntry.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.whitelistEntry.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const whitelistsService = new WhitelistsService();
