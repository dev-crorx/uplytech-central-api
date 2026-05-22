import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse, slugify } from '../../../core/utils';

const log = new ModuleLogger('DocsService');

export class DocsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.DocPageWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.docPage.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.DocPageOrderByWithRelationInput,
        
      }),
      prisma.docPage.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.docPage.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('DocPage');
    }

    return record;
  }

  async create(data: Prisma.DocPageCreateInput, userId?: string) {
    const nameOrTitle = (data as Record<string, unknown>).name || (data as Record<string, unknown>).title || '';
    const slug = slugify(String(nameOrTitle));
    (data as Record<string, unknown>).slug = slug;
    
    

    const record = await prisma.docPage.create({ data });

    await eventBus.emit('docs.created', {
      type: 'docs.created',
      source: 'docs-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'docs', record.id);

    log.info('DocPage created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.DocPageUpdateInput, userId?: string) {
    const existing = await prisma.docPage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('DocPage');
    }

    const record = await prisma.docPage.update({
      where: { id },
      data,
    });

    await eventBus.emit('docs.updated', {
      type: 'docs.updated',
      source: 'docs-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'docs', id);

    log.info('DocPage updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.docPage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('DocPage');
    }

    await prisma.docPage.delete({ where: { id } });

    await eventBus.emit('docs.deleted', {
      type: 'docs.deleted',
      source: 'docs-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'docs', id);

    log.info('DocPage deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.DocPageWhereInput = {
      title: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.docPage.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.docPage.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const docsService = new DocsService();
