import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('HostingService');

export class HostingService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.HostingInstanceWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.hostingInstance.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.HostingInstanceOrderByWithRelationInput,
        
      }),
      prisma.hostingInstance.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.hostingInstance.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('HostingInstance');
    }

    return record;
  }

  async create(data: Prisma.HostingInstanceCreateInput, userId?: string) {
    
    
    

    const record = await prisma.hostingInstance.create({ data });

    await eventBus.emit('hosting.created', {
      type: 'hosting.created',
      source: 'hosting-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'hosting', record.id);

    log.info('HostingInstance created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.HostingInstanceUpdateInput, userId?: string) {
    const existing = await prisma.hostingInstance.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('HostingInstance');
    }

    const record = await prisma.hostingInstance.update({
      where: { id },
      data,
    });

    await eventBus.emit('hosting.updated', {
      type: 'hosting.updated',
      source: 'hosting-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'hosting', id);

    log.info('HostingInstance updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.hostingInstance.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('HostingInstance');
    }

    await prisma.hostingInstance.delete({ where: { id } });

    await eventBus.emit('hosting.deleted', {
      type: 'hosting.deleted',
      source: 'hosting-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'hosting', id);

    log.info('HostingInstance deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.HostingInstanceWhereInput = {
      name: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.hostingInstance.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.hostingInstance.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const hostingService = new HostingService();
