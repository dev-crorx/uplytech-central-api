import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('StreamingService');

export class StreamingService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.StreamConfigWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.streamConfig.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.StreamConfigOrderByWithRelationInput,
        
      }),
      prisma.streamConfig.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.streamConfig.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('StreamConfig');
    }

    return record;
  }

  async create(data: Prisma.StreamConfigCreateInput, userId?: string) {
    
    
    

    const record = await prisma.streamConfig.create({ data });

    await eventBus.emit('streaming.created', {
      type: 'streaming.created',
      source: 'streaming-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'streaming', record.id);

    log.info('StreamConfig created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.StreamConfigUpdateInput, userId?: string) {
    const existing = await prisma.streamConfig.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('StreamConfig');
    }

    const record = await prisma.streamConfig.update({
      where: { id },
      data,
    });

    await eventBus.emit('streaming.updated', {
      type: 'streaming.updated',
      source: 'streaming-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'streaming', id);

    log.info('StreamConfig updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.streamConfig.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('StreamConfig');
    }

    await prisma.streamConfig.delete({ where: { id } });

    await eventBus.emit('streaming.deleted', {
      type: 'streaming.deleted',
      source: 'streaming-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'streaming', id);

    log.info('StreamConfig deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.StreamConfigWhereInput = {
      name: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.streamConfig.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.streamConfig.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const streamingService = new StreamingService();
