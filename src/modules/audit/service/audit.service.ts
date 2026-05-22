import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('AuditService');

export class AuditService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.AuditLogOrderByWithRelationInput,
        
      }),
      prisma.auditLog.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.auditLog.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('AuditLog');
    }

    return record;
  }

  async create(data: Prisma.AuditLogCreateInput, userId?: string) {
    
    
    

    const record = await prisma.auditLog.create({ data });

    await eventBus.emit('audit.created', {
      type: 'audit.created',
      source: 'audit-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'audit', record.id);

    log.info('AuditLog created', { id: record.id });

    return record;
  }

  

  async search(query: string, params: PaginationParams) {
    const where: Prisma.AuditLogWhereInput = {
      action: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { id: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const auditService = new AuditService();
