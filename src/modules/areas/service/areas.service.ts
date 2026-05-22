import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse, slugify } from '../../../core/utils';

const log = new ModuleLogger('AreasService');

export class AreasService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.AreaWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.area.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.AreaOrderByWithRelationInput,
        
      }),
      prisma.area.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.area.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Area');
    }

    return record;
  }

  async create(data: Prisma.AreaCreateInput, userId?: string) {
    const nameOrTitle = (data as Record<string, unknown>).name || (data as Record<string, unknown>).title || '';
    const slug = slugify(String(nameOrTitle));
    (data as Record<string, unknown>).slug = slug;
    
    

    const record = await prisma.area.create({ data });

    await eventBus.emit('areas.created', {
      type: 'areas.created',
      source: 'areas-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'areas', record.id);

    log.info('Area created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.AreaUpdateInput, userId?: string) {
    const existing = await prisma.area.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Area');
    }

    const record = await prisma.area.update({
      where: { id },
      data,
    });

    await eventBus.emit('areas.updated', {
      type: 'areas.updated',
      source: 'areas-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'areas', id);

    log.info('Area updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.area.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Area');
    }

    await prisma.area.delete({ where: { id } });

    await eventBus.emit('areas.deleted', {
      type: 'areas.deleted',
      source: 'areas-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'areas', id);

    log.info('Area deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.AreaWhereInput = {
      name: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.area.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.area.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const areasService = new AreasService();
