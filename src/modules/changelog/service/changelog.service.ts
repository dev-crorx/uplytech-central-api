import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ChangelogService');

export class ChangelogService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.ChangelogWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.changelog.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.ChangelogOrderByWithRelationInput,
        
      }),
      prisma.changelog.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.changelog.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Changelog');
    }

    return record;
  }

  async create(data: Prisma.ChangelogCreateInput, userId?: string) {
    
    
    

    const record = await prisma.changelog.create({ data });

    await eventBus.emit('changelog.created', {
      type: 'changelog.created',
      source: 'changelog-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'changelog', record.id);

    log.info('Changelog created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.ChangelogUpdateInput, userId?: string) {
    const existing = await prisma.changelog.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Changelog');
    }

    const record = await prisma.changelog.update({
      where: { id },
      data,
    });

    await eventBus.emit('changelog.updated', {
      type: 'changelog.updated',
      source: 'changelog-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'changelog', id);

    log.info('Changelog updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.changelog.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Changelog');
    }

    await prisma.changelog.delete({ where: { id } });

    await eventBus.emit('changelog.deleted', {
      type: 'changelog.deleted',
      source: 'changelog-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'changelog', id);

    log.info('Changelog deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.ChangelogWhereInput = {
      title: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.changelog.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.changelog.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const changelogService = new ChangelogService();
