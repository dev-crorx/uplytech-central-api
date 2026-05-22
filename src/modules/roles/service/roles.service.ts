import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('RolesService');

export class RolesService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.RoleWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.role.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.RoleOrderByWithRelationInput,
        
      }),
      prisma.role.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.role.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Role');
    }

    return record;
  }

  async create(data: Prisma.RoleCreateInput, userId?: string) {
    
    
    

    const record = await prisma.role.create({ data });

    await eventBus.emit('roles.created', {
      type: 'roles.created',
      source: 'roles-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'roles', record.id);

    log.info('Role created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.RoleUpdateInput, userId?: string) {
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Role');
    }

    const record = await prisma.role.update({
      where: { id },
      data,
    });

    await eventBus.emit('roles.updated', {
      type: 'roles.updated',
      source: 'roles-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'roles', id);

    log.info('Role updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Role');
    }

    await prisma.role.delete({ where: { id } });

    await eventBus.emit('roles.deleted', {
      type: 'roles.deleted',
      source: 'roles-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'roles', id);

    log.info('Role deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.RoleWhereInput = {
      name: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.role.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.role.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const rolesService = new RolesService();
