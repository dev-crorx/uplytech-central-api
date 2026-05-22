import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse, slugify } from '../../../core/utils';

const log = new ModuleLogger('WikiService');

export class WikiService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.WikiPageWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.wikiPage.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.WikiPageOrderByWithRelationInput,
        
      }),
      prisma.wikiPage.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.wikiPage.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('WikiPage');
    }

    return record;
  }

  async create(data: Prisma.WikiPageCreateInput, userId?: string) {
    const nameOrTitle = (data as Record<string, unknown>).name || (data as Record<string, unknown>).title || '';
    const slug = slugify(String(nameOrTitle));
    (data as Record<string, unknown>).slug = slug;
    (data as Record<string, unknown>).author = { connect: { id: userId || '' } };
    

    const record = await prisma.wikiPage.create({ data });

    await eventBus.emit('wiki.created', {
      type: 'wiki.created',
      source: 'wiki-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'wiki', record.id);

    log.info('WikiPage created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.WikiPageUpdateInput, userId?: string) {
    const existing = await prisma.wikiPage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('WikiPage');
    }

    const record = await prisma.wikiPage.update({
      where: { id },
      data,
    });

    await eventBus.emit('wiki.updated', {
      type: 'wiki.updated',
      source: 'wiki-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'wiki', id);

    log.info('WikiPage updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.wikiPage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('WikiPage');
    }

    await prisma.wikiPage.delete({ where: { id } });

    await eventBus.emit('wiki.deleted', {
      type: 'wiki.deleted',
      source: 'wiki-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'wiki', id);

    log.info('WikiPage deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.WikiPageWhereInput = {
      title: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.wikiPage.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.wikiPage.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const wikiService = new WikiService();
