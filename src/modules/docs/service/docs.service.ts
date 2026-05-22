// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('DocsService');

export class DocsService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.docPage.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.docPage.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.docPage.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Docs');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.docPage.create({ data: data as Prisma.DocPageCreateInput });
    await eventBus.emit('docs.created', { type: 'docs.created', source: 'docs-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'DOCS_CREATED', 'docs', item.id);
    log.info('Docs created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.docPage.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Docs');
    const updated = await prisma.docPage.update({ where: { id }, data: data as Prisma.DocPageUpdateInput });
    await createAuditEntry(userId, 'DOCS_UPDATED', 'docs', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.docPage.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Docs');
    await prisma.docPage.delete({ where: { id } });
    await createAuditEntry(userId, 'DOCS_DELETED', 'docs', id);
    log.info('Docs deleted', { id });
  }
}

export const docsService = new DocsService();