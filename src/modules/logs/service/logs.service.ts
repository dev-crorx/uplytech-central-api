import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('LogsService');

export class LogsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.LogEntryWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.logEntry.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.LogEntryOrderByWithRelationInput,
        
      }),
      prisma.logEntry.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.logEntry.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('LogEntry');
    }

    return record;
  }

  async create(data: Prisma.LogEntryCreateInput, userId?: string) {
    
    
    

    const record = await prisma.logEntry.create({ data });

    await eventBus.emit('logs.created', {
      type: 'logs.created',
      source: 'logs-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'logs', record.id);

    log.info('LogEntry created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.LogEntryUpdateInput, userId?: string) {
    const existing = await prisma.logEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('LogEntry');
    }

    const record = await prisma.logEntry.update({
      where: { id },
      data,
    });

    await eventBus.emit('logs.updated', {
      type: 'logs.updated',
      source: 'logs-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'logs', id);

    log.info('LogEntry updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.logEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('LogEntry');
    }

    await prisma.logEntry.delete({ where: { id } });

    await eventBus.emit('logs.deleted', {
      type: 'logs.deleted',
      source: 'logs-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'logs', id);

    log.info('LogEntry deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.LogEntryWhereInput = {
      message: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.logEntry.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { id: 'desc' },
      }),
      prisma.logEntry.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const logsService = new LogsService();
