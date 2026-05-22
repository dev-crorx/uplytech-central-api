import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('StorageService');

export class StorageService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.FileUploadWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.fileUpload.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.FileUploadOrderByWithRelationInput,
        
      }),
      prisma.fileUpload.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.fileUpload.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('FileUpload');
    }

    return record;
  }

  async create(data: Prisma.FileUploadCreateInput, userId?: string) {
    
    
    

    const record = await prisma.fileUpload.create({ data });

    await eventBus.emit('storage.created', {
      type: 'storage.created',
      source: 'storage-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'storage', record.id);

    log.info('FileUpload created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.FileUploadUpdateInput, userId?: string) {
    const existing = await prisma.fileUpload.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('FileUpload');
    }

    const record = await prisma.fileUpload.update({
      where: { id },
      data,
    });

    await eventBus.emit('storage.updated', {
      type: 'storage.updated',
      source: 'storage-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'storage', id);

    log.info('FileUpload updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.fileUpload.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('FileUpload');
    }

    await prisma.fileUpload.delete({ where: { id } });

    await eventBus.emit('storage.deleted', {
      type: 'storage.deleted',
      source: 'storage-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'storage', id);

    log.info('FileUpload deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.FileUploadWhereInput = {
      fileName: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.fileUpload.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.fileUpload.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const storageService = new StorageService();
