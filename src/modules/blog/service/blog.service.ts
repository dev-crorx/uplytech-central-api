import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse, slugify } from '../../../core/utils';

const log = new ModuleLogger('BlogService');

export class BlogService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.BlogPostWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.BlogPostOrderByWithRelationInput,
        include: { author: { select: { id: true, username: true, displayName: true, avatar: true } }, category: true }
      }),
      prisma.blogPost.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.blogPost.findUnique({
      where: { id },
      include: { author: { select: { id: true, username: true, displayName: true, avatar: true } }, category: true }
    });

    if (!record) {
      throw new NotFoundError('BlogPost');
    }

    return record;
  }

  async create(data: Prisma.BlogPostCreateInput, userId?: string) {
    const nameOrTitle = (data as Record<string, unknown>).name || (data as Record<string, unknown>).title || '';
    const slug = slugify(String(nameOrTitle));
    (data as Record<string, unknown>).slug = slug;
    (data as Record<string, unknown>).author = { connect: { id: userId || '' } };
    

    const record = await prisma.blogPost.create({ data });

    await eventBus.emit('blog.created', {
      type: 'blog.created',
      source: 'blog-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'blog', record.id);

    log.info('BlogPost created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.BlogPostUpdateInput, userId?: string) {
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('BlogPost');
    }

    const record = await prisma.blogPost.update({
      where: { id },
      data,
    });

    await eventBus.emit('blog.updated', {
      type: 'blog.updated',
      source: 'blog-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'blog', id);

    log.info('BlogPost updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('BlogPost');
    }

    await prisma.blogPost.delete({ where: { id } });

    await eventBus.emit('blog.deleted', {
      type: 'blog.deleted',
      source: 'blog-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'blog', id);

    log.info('BlogPost deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.BlogPostWhereInput = {
      title: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const blogService = new BlogService();
