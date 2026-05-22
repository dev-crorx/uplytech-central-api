import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('DownloadsService');

export class DownloadsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.DownloadWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.download.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.DownloadOrderByWithRelationInput,
        
      }),
      prisma.download.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.download.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Download');
    }

    return record;
  }

  async create(data: Prisma.DownloadCreateInput, userId?: string) {
    
    
    

    const record = await prisma.download.create({ data });

    await eventBus.emit('downloads.created', {
      type: 'downloads.created',
      source: 'downloads-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'downloads', record.id);

    log.info('Download created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.DownloadUpdateInput, userId?: string) {
    const existing = await prisma.download.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Download');
    }

    const record = await prisma.download.update({
      where: { id },
      data,
    });

    await eventBus.emit('downloads.updated', {
      type: 'downloads.updated',
      source: 'downloads-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'downloads', id);

    log.info('Download updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.download.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Download');
    }

    await prisma.download.delete({ where: { id } });

    await eventBus.emit('downloads.deleted', {
      type: 'downloads.deleted',
      source: 'downloads-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'downloads', id);

    log.info('Download deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.DownloadWhereInput = {
      fileName: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.download.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.download.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const downloadsService = new DownloadsService();
