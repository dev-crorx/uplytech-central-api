import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ScansService');

export class ScansService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.ContentScanWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.contentScan.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.ContentScanOrderByWithRelationInput,
        
      }),
      prisma.contentScan.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.contentScan.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('ContentScan');
    }

    return record;
  }

  async create(data: Prisma.ContentScanCreateInput, userId?: string) {
    
    
    

    const record = await prisma.contentScan.create({ data });

    await eventBus.emit('scans.created', {
      type: 'scans.created',
      source: 'scans-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'scans', record.id);

    log.info('ContentScan created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.ContentScanUpdateInput, userId?: string) {
    const existing = await prisma.contentScan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('ContentScan');
    }

    const record = await prisma.contentScan.update({
      where: { id },
      data,
    });

    await eventBus.emit('scans.updated', {
      type: 'scans.updated',
      source: 'scans-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'scans', id);

    log.info('ContentScan updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.contentScan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('ContentScan');
    }

    await prisma.contentScan.delete({ where: { id } });

    await eventBus.emit('scans.deleted', {
      type: 'scans.deleted',
      source: 'scans-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'scans', id);

    log.info('ContentScan deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.ContentScanWhereInput = {
      scanType: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.contentScan.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { id: 'desc' },
      }),
      prisma.contentScan.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const scansService = new ScansService();
