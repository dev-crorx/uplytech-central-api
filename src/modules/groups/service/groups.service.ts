import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse, slugify } from '../../../core/utils';

const log = new ModuleLogger('GroupsService');

export class GroupsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.GroupWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.group.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.GroupOrderByWithRelationInput,
        include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } } }
      }),
      prisma.group.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.group.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } } }
    });

    if (!record) {
      throw new NotFoundError('Group');
    }

    return record;
  }

  async create(data: Prisma.GroupCreateInput, userId?: string) {
    const nameOrTitle = (data as Record<string, unknown>).name || (data as Record<string, unknown>).title || '';
    const slug = slugify(String(nameOrTitle));
    (data as Record<string, unknown>).slug = slug;
    
    

    const record = await prisma.group.create({ data });

    await eventBus.emit('groups.created', {
      type: 'groups.created',
      source: 'groups-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'groups', record.id);

    log.info('Group created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.GroupUpdateInput, userId?: string) {
    const existing = await prisma.group.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Group');
    }

    const record = await prisma.group.update({
      where: { id },
      data,
    });

    await eventBus.emit('groups.updated', {
      type: 'groups.updated',
      source: 'groups-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'groups', id);

    log.info('Group updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.group.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Group');
    }

    await prisma.group.delete({ where: { id } });

    await eventBus.emit('groups.deleted', {
      type: 'groups.deleted',
      source: 'groups-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'groups', id);

    log.info('Group deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.GroupWhereInput = {
      name: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.group.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.group.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const groupsService = new GroupsService();
