import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('BroadcastsService');

export class BroadcastsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.BroadcastWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.broadcast.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.BroadcastOrderByWithRelationInput,
        
      }),
      prisma.broadcast.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.broadcast.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Broadcast');
    }

    return record;
  }

  async create(data: Prisma.BroadcastCreateInput, userId?: string) {
    
    
    

    const record = await prisma.broadcast.create({ data });

    await eventBus.emit('broadcasts.created', {
      type: 'broadcasts.created',
      source: 'broadcasts-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'broadcasts', record.id);

    log.info('Broadcast created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.BroadcastUpdateInput, userId?: string) {
    const existing = await prisma.broadcast.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Broadcast');
    }

    const record = await prisma.broadcast.update({
      where: { id },
      data,
    });

    await eventBus.emit('broadcasts.updated', {
      type: 'broadcasts.updated',
      source: 'broadcasts-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'broadcasts', id);

    log.info('Broadcast updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.broadcast.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Broadcast');
    }

    await prisma.broadcast.delete({ where: { id } });

    await eventBus.emit('broadcasts.deleted', {
      type: 'broadcasts.deleted',
      source: 'broadcasts-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'broadcasts', id);

    log.info('Broadcast deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.BroadcastWhereInput = {
      title: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.broadcast.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.broadcast.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const broadcastsService = new BroadcastsService();
