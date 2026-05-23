import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('WikiService');

export class WikiService {
  async getSpaces(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.wikiSpace.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { name: 'asc' }, include: { _count: { select: { pages: true } } } }),
      prisma.wikiSpace.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async createSpace(data: { name: string; slug: string; description?: string; isPublic?: boolean }, userId: string) {
    const space = await prisma.wikiSpace.create({ data: { name: data.name, slug: data.slug, description: data.description || null, isPublic: data.isPublic !== false } });
    await createAuditEntry(userId, 'WIKI_SPACE_CREATED', 'wiki', space.id);
    log.info('Wiki space created', { id: space.id });
    return space;
  }

  async getPages(spaceId: string, params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.wikiPage.findMany({ where: { spaceId }, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { title: 'asc' },
        include: { author: { select: { id: true, username: true, displayName: true } }, _count: { select: { revisions: true } } } }),
      prisma.wikiPage.count({ where: { spaceId } }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getPage(id: string) {
    const page = await prisma.wikiPage.findUnique({ where: { id },
      include: { author: { select: { id: true, username: true, displayName: true } }, space: { select: { id: true, name: true } } } });
    if (!page) throw new NotFoundError('Wiki page');
    return page;
  }

  async getPageBySlug(spaceSlug: string, pageSlug: string) {
    const space = await prisma.wikiSpace.findFirst({ where: { slug: spaceSlug } });
    if (!space) throw new NotFoundError('Wiki space');
    const page = await prisma.wikiPage.findFirst({ where: { spaceId: space.id, slug: pageSlug },
      include: { author: { select: { id: true, username: true, displayName: true } } } });
    if (!page) throw new NotFoundError('Wiki page');
    return page;
  }

  async createPage(data: { title: string; content: string; slug: string; spaceId: string; parentId?: string }, userId: string) {
    const page = await prisma.wikiPage.create({
      data: { title: data.title, content: data.content, slug: data.slug, spaceId: data.spaceId, parentId: data.parentId || null, authorId: userId, version: 1, status: 'PUBLISHED' },
    });
    await prisma.wikiRevision.create({
      data: { pageId: page.id, content: data.content, version: 1, authorId: userId, changeNote: 'Initial version' },
    });
    await eventBus.emit('wiki.page_created', { type: 'wiki.page_created', source: 'wiki-service', data: { id: page.id }, userId });
    await createAuditEntry(userId, 'WIKI_PAGE_CREATED', 'wiki', page.id);
    return page;
  }

  async updatePage(id: string, data: { title?: string; content?: string; changeNote?: string }, userId: string) {
    const page = await prisma.wikiPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundError('Wiki page');
    const newVersion = page.version + 1;
    const updated = await prisma.wikiPage.update({ where: { id }, data: { ...data, version: newVersion } });
    if (data.content) {
      await prisma.wikiRevision.create({
        data: { pageId: id, content: data.content, version: newVersion, authorId: userId, changeNote: data.changeNote || null },
      });
    }
    await eventBus.emit('wiki.page_updated', { type: 'wiki.page_updated', source: 'wiki-service', data: { id, version: newVersion }, userId });
    await createAuditEntry(userId, 'WIKI_PAGE_UPDATED', 'wiki', id);
    return updated;
  }

  async getRevisions(pageId: string) {
    return prisma.wikiRevision.findMany({ where: { pageId }, orderBy: { version: 'desc' },
      include: { author: { select: { id: true, username: true, displayName: true } } } });
  }

  async revertToRevision(pageId: string, revisionId: string, userId: string) {
    const revision = await prisma.wikiRevision.findUnique({ where: { id: revisionId } });
    if (!revision) throw new NotFoundError('Revision');
    const page = await prisma.wikiPage.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundError('Wiki page');
    const newVersion = page.version + 1;
    await prisma.wikiPage.update({ where: { id: pageId }, data: { content: revision.content, version: newVersion } });
    await prisma.wikiRevision.create({ data: { pageId, content: revision.content, version: newVersion, authorId: userId, changeNote: 'Reverted to v' + revision.version } });
    await createAuditEntry(userId, 'WIKI_PAGE_REVERTED', 'wiki', pageId, { revisionId, toVersion: revision.version } as object);
  }

  async deletePage(id: string, userId: string) {
    const page = await prisma.wikiPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundError('Wiki page');
    await prisma.wikiRevision.deleteMany({ where: { pageId: id } });
    await prisma.wikiPage.delete({ where: { id } });
    await createAuditEntry(userId, 'WIKI_PAGE_DELETED', 'wiki', id);
  }

  async searchPages(query: string, params: PaginationParams) {
    const where: Prisma.WikiPageWhereInput = { OR: [{ title: { contains: query } }, { content: { contains: query } }] };
    const [data, total] = await Promise.all([
      prisma.wikiPage.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { updatedAt: 'desc' },
        include: { space: { select: { name: true, slug: true } }, author: { select: { id: true, username: true } } } }),
      prisma.wikiPage.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getPageTree(spaceId: string) {
    return prisma.wikiPage.findMany({ where: { spaceId }, select: { id: true, title: true, slug: true, parentId: true, version: true, updatedAt: true }, orderBy: { title: 'asc' } });
  }
}

export const wikiService = new WikiService();