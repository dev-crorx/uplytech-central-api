import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ReleasesService');

export class ReleasesService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.ReleaseWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.release.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.ReleaseOrderByWithRelationInput,
        
      }),
      prisma.release.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.release.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Release');
    }

    return record;
  }

  async create(data: Prisma.ReleaseCreateInput, userId?: string) {
    
    
    

    const record = await prisma.release.create({ data });

    await eventBus.emit('releases.created', {
      type: 'releases.created',
      source: 'releases-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'releases', record.id);

    log.info('Release created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.ReleaseUpdateInput, userId?: string) {
    const existing = await prisma.release.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Release');
    }

    const record = await prisma.release.update({
      where: { id },
      data,
    });

    await eventBus.emit('releases.updated', {
      type: 'releases.updated',
      source: 'releases-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'releases', id);

    log.info('Release updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.release.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Release');
    }

    await prisma.release.delete({ where: { id } });

    await eventBus.emit('releases.deleted', {
      type: 'releases.deleted',
      source: 'releases-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'releases', id);

    log.info('Release deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.ReleaseWhereInput = {
      title: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.release.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.release.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const releasesService = new ReleasesService();
