import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('UsersService');

export class UsersService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.UserWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.UserOrderByWithRelationInput,
        include: { userRoles: { include: { role: true } } }
      }),
      prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } }
    });

    if (!record) {
      throw new NotFoundError('User');
    }

    return record;
  }

  async create(data: Prisma.UserCreateInput, userId?: string) {
    
    
    

    const record = await prisma.user.create({ data });

    await eventBus.emit('users.created', {
      type: 'users.created',
      source: 'users-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'users', record.id);

    log.info('User created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.UserUpdateInput, userId?: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('User');
    }

    const record = await prisma.user.update({
      where: { id },
      data,
    });

    await eventBus.emit('users.updated', {
      type: 'users.updated',
      source: 'users-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'users', id);

    log.info('User updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('User');
    }

    await prisma.user.delete({ where: { id } });

    await eventBus.emit('users.deleted', {
      type: 'users.deleted',
      source: 'users-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'users', id);

    log.info('User deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.UserWhereInput = {
      username: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const usersService = new UsersService();
