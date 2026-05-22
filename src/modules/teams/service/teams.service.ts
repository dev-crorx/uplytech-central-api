import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse, slugify } from '../../../core/utils';

const log = new ModuleLogger('TeamsService');

export class TeamsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.TeamWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.team.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.TeamOrderByWithRelationInput,
        include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } } }
      }),
      prisma.team.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.team.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } } }
    });

    if (!record) {
      throw new NotFoundError('Team');
    }

    return record;
  }

  async create(data: Prisma.TeamCreateInput, userId?: string) {
    const nameOrTitle = (data as Record<string, unknown>).name || (data as Record<string, unknown>).title || '';
    const slug = slugify(String(nameOrTitle));
    (data as Record<string, unknown>).slug = slug;
    
    

    const record = await prisma.team.create({ data });

    await eventBus.emit('teams.created', {
      type: 'teams.created',
      source: 'teams-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'teams', record.id);

    log.info('Team created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.TeamUpdateInput, userId?: string) {
    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Team');
    }

    const record = await prisma.team.update({
      where: { id },
      data,
    });

    await eventBus.emit('teams.updated', {
      type: 'teams.updated',
      source: 'teams-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'teams', id);

    log.info('Team updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Team');
    }

    await prisma.team.delete({ where: { id } });

    await eventBus.emit('teams.deleted', {
      type: 'teams.deleted',
      source: 'teams-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'teams', id);

    log.info('Team deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.TeamWhereInput = {
      name: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.team.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.team.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const teamsService = new TeamsService();
