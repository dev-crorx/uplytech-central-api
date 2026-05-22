import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ApiManagementService');

export class ApiManagementService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.ApiEndpointWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.apiEndpoint.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.ApiEndpointOrderByWithRelationInput,
        
      }),
      prisma.apiEndpoint.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.apiEndpoint.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('ApiEndpoint');
    }

    return record;
  }

  async create(data: Prisma.ApiEndpointCreateInput, userId?: string) {
    
    
    

    const record = await prisma.apiEndpoint.create({ data });

    await eventBus.emit('api-management.created', {
      type: 'api-management.created',
      source: 'api-management-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'api-management', record.id);

    log.info('ApiEndpoint created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.ApiEndpointUpdateInput, userId?: string) {
    const existing = await prisma.apiEndpoint.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('ApiEndpoint');
    }

    const record = await prisma.apiEndpoint.update({
      where: { id },
      data,
    });

    await eventBus.emit('api-management.updated', {
      type: 'api-management.updated',
      source: 'api-management-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'api-management', id);

    log.info('ApiEndpoint updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.apiEndpoint.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('ApiEndpoint');
    }

    await prisma.apiEndpoint.delete({ where: { id } });

    await eventBus.emit('api-management.deleted', {
      type: 'api-management.deleted',
      source: 'api-management-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'api-management', id);

    log.info('ApiEndpoint deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.ApiEndpointWhereInput = {
      path: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.apiEndpoint.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.apiEndpoint.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const apiManagementService = new ApiManagementService();
