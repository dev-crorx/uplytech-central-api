import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse, slugify } from '../../../core/utils';

const log = new ModuleLogger('ServicesService');

export class ServicesService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.ServiceWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.ServiceOrderByWithRelationInput,
        
      }),
      prisma.service.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.service.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Service');
    }

    return record;
  }

  async create(data: Prisma.ServiceCreateInput, userId?: string) {
    const nameOrTitle = (data as Record<string, unknown>).name || (data as Record<string, unknown>).title || '';
    const slug = slugify(String(nameOrTitle));
    (data as Record<string, unknown>).slug = slug;
    
    

    const record = await prisma.service.create({ data });

    await eventBus.emit('services.created', {
      type: 'services.created',
      source: 'services-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'services', record.id);

    log.info('Service created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.ServiceUpdateInput, userId?: string) {
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Service');
    }

    const record = await prisma.service.update({
      where: { id },
      data,
    });

    await eventBus.emit('services.updated', {
      type: 'services.updated',
      source: 'services-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'services', id);

    log.info('Service updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Service');
    }

    await prisma.service.delete({ where: { id } });

    await eventBus.emit('services.deleted', {
      type: 'services.deleted',
      source: 'services-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'services', id);

    log.info('Service deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.ServiceWhereInput = {
      name: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.service.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const servicesService = new ServicesService();
