import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse, slugify } from '../../../core/utils';

const log = new ModuleLogger('TournamentsService');

export class TournamentsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.TournamentWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.TournamentOrderByWithRelationInput,
        include: { game: true, participants: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } } }
      }),
      prisma.tournament.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.tournament.findUnique({
      where: { id },
      include: { game: true, participants: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } } }
    });

    if (!record) {
      throw new NotFoundError('Tournament');
    }

    return record;
  }

  async create(data: Prisma.TournamentCreateInput, userId?: string) {
    const nameOrTitle = (data as Record<string, unknown>).name || (data as Record<string, unknown>).title || '';
    const slug = slugify(String(nameOrTitle));
    (data as Record<string, unknown>).slug = slug;
    
    

    const record = await prisma.tournament.create({ data });

    await eventBus.emit('tournaments.created', {
      type: 'tournaments.created',
      source: 'tournaments-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'tournaments', record.id);

    log.info('Tournament created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.TournamentUpdateInput, userId?: string) {
    const existing = await prisma.tournament.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Tournament');
    }

    const record = await prisma.tournament.update({
      where: { id },
      data,
    });

    await eventBus.emit('tournaments.updated', {
      type: 'tournaments.updated',
      source: 'tournaments-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'tournaments', id);

    log.info('Tournament updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.tournament.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Tournament');
    }

    await prisma.tournament.delete({ where: { id } });

    await eventBus.emit('tournaments.deleted', {
      type: 'tournaments.deleted',
      source: 'tournaments-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'tournaments', id);

    log.info('Tournament deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.TournamentWhereInput = {
      name: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tournament.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const tournamentsService = new TournamentsService();
