import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ArchiveService');

export class ArchiveService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.ArchiveWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.archive.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.ArchiveOrderByWithRelationInput,
        
      }),
      prisma.archive.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.archive.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Archive');
    }

    return record;
  }

  async create(data: Prisma.ArchiveCreateInput, userId?: string) {
    
    
    

    const record = await prisma.archive.create({ data });

    await eventBus.emit('archive.created', {
      type: 'archive.created',
      source: 'archive-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'archive', record.id);

    log.info('Archive created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.ArchiveUpdateInput, userId?: string) {
    const existing = await prisma.archive.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Archive');
    }

    const record = await prisma.archive.update({
      where: { id },
      data,
    });

    await eventBus.emit('archive.updated', {
      type: 'archive.updated',
      source: 'archive-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'archive', id);

    log.info('Archive updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.archive.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Archive');
    }

    await prisma.archive.delete({ where: { id } });

    await eventBus.emit('archive.deleted', {
      type: 'archive.deleted',
      source: 'archive-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'archive', id);

    log.info('Archive deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.ArchiveWhereInput = {
      resourceType: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.archive.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.archive.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const archiveService = new ArchiveService();
