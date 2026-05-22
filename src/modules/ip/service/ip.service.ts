import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('IpService');

export class IpService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.IpEntryWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.ipEntry.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.IpEntryOrderByWithRelationInput,
        
      }),
      prisma.ipEntry.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.ipEntry.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('IpEntry');
    }

    return record;
  }

  async create(data: Prisma.IpEntryCreateInput, userId?: string) {
    
    
    

    const record = await prisma.ipEntry.create({ data });

    await eventBus.emit('ip.created', {
      type: 'ip.created',
      source: 'ip-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'ip', record.id);

    log.info('IpEntry created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.IpEntryUpdateInput, userId?: string) {
    const existing = await prisma.ipEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('IpEntry');
    }

    const record = await prisma.ipEntry.update({
      where: { id },
      data,
    });

    await eventBus.emit('ip.updated', {
      type: 'ip.updated',
      source: 'ip-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'ip', id);

    log.info('IpEntry updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.ipEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('IpEntry');
    }

    await prisma.ipEntry.delete({ where: { id } });

    await eventBus.emit('ip.deleted', {
      type: 'ip.deleted',
      source: 'ip-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'ip', id);

    log.info('IpEntry deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.IpEntryWhereInput = {
      address: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.ipEntry.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.ipEntry.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const ipService = new IpService();
