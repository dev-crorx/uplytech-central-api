import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse, slugify } from '../../../core/utils';

const log = new ModuleLogger('GamesService');

export class GamesService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.GameWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.game.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.GameOrderByWithRelationInput,
        
      }),
      prisma.game.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.game.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Game');
    }

    return record;
  }

  async create(data: Prisma.GameCreateInput, userId?: string) {
    const nameOrTitle = (data as Record<string, unknown>).name || (data as Record<string, unknown>).title || '';
    const slug = slugify(String(nameOrTitle));
    (data as Record<string, unknown>).slug = slug;
    
    

    const record = await prisma.game.create({ data });

    await eventBus.emit('games.created', {
      type: 'games.created',
      source: 'games-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'games', record.id);

    log.info('Game created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.GameUpdateInput, userId?: string) {
    const existing = await prisma.game.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Game');
    }

    const record = await prisma.game.update({
      where: { id },
      data,
    });

    await eventBus.emit('games.updated', {
      type: 'games.updated',
      source: 'games-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'games', id);

    log.info('Game updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.game.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Game');
    }

    await prisma.game.delete({ where: { id } });

    await eventBus.emit('games.deleted', {
      type: 'games.deleted',
      source: 'games-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'games', id);

    log.info('Game deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.GameWhereInput = {
      name: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.game.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.game.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const gamesService = new GamesService();
