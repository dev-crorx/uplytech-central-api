import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('FriendsService');

export class FriendsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.FriendWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.friend.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.FriendOrderByWithRelationInput,
        
      }),
      prisma.friend.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.friend.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Friend');
    }

    return record;
  }

  async create(data: Prisma.FriendCreateInput, userId?: string) {
    
    
    

    const record = await prisma.friend.create({ data });

    await eventBus.emit('friends.created', {
      type: 'friends.created',
      source: 'friends-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'friends', record.id);

    log.info('Friend created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.FriendUpdateInput, userId?: string) {
    const existing = await prisma.friend.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Friend');
    }

    const record = await prisma.friend.update({
      where: { id },
      data,
    });

    await eventBus.emit('friends.updated', {
      type: 'friends.updated',
      source: 'friends-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'friends', id);

    log.info('Friend updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.friend.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Friend');
    }

    await prisma.friend.delete({ where: { id } });

    await eventBus.emit('friends.deleted', {
      type: 'friends.deleted',
      source: 'friends-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'friends', id);

    log.info('Friend deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.FriendWhereInput = {
      userId: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.friend.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.friend.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const friendsService = new FriendsService();
