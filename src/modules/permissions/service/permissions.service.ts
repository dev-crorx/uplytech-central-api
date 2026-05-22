import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('PermissionsService');

export class PermissionsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.PermissionWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.PermissionOrderByWithRelationInput,
        
      }),
      prisma.permission.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.permission.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Permission');
    }

    return record;
  }

  async create(data: Prisma.PermissionCreateInput, userId?: string) {
    
    
    

    const record = await prisma.permission.create({ data });

    await eventBus.emit('permissions.created', {
      type: 'permissions.created',
      source: 'permissions-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'permissions', record.id);

    log.info('Permission created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.PermissionUpdateInput, userId?: string) {
    const existing = await prisma.permission.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Permission');
    }

    const record = await prisma.permission.update({
      where: { id },
      data,
    });

    await eventBus.emit('permissions.updated', {
      type: 'permissions.updated',
      source: 'permissions-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'permissions', id);

    log.info('Permission updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.permission.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Permission');
    }

    await prisma.permission.delete({ where: { id } });

    await eventBus.emit('permissions.deleted', {
      type: 'permissions.deleted',
      source: 'permissions-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'permissions', id);

    log.info('Permission deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.PermissionWhereInput = {
      resource: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.permission.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const permissionsService = new PermissionsService();
