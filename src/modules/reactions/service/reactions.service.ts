import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ReactionsService');

export class ReactionsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.ReactionWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.reaction.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.ReactionOrderByWithRelationInput,
        
      }),
      prisma.reaction.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.reaction.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Reaction');
    }

    return record;
  }

  async create(data: Prisma.ReactionCreateInput, userId?: string) {
    
    
    

    const record = await prisma.reaction.create({ data });

    await eventBus.emit('reactions.created', {
      type: 'reactions.created',
      source: 'reactions-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'reactions', record.id);

    log.info('Reaction created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.ReactionUpdateInput, userId?: string) {
    const existing = await prisma.reaction.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Reaction');
    }

    const record = await prisma.reaction.update({
      where: { id },
      data,
    });

    await eventBus.emit('reactions.updated', {
      type: 'reactions.updated',
      source: 'reactions-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'reactions', id);

    log.info('Reaction updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.reaction.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Reaction');
    }

    await prisma.reaction.delete({ where: { id } });

    await eventBus.emit('reactions.deleted', {
      type: 'reactions.deleted',
      source: 'reactions-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'reactions', id);

    log.info('Reaction deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.ReactionWhereInput = {
      type: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.reaction.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.reaction.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const reactionsService = new ReactionsService();
