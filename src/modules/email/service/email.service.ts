import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('EmailService');

export class EmailService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.EmailWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.email.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.EmailOrderByWithRelationInput,
        
      }),
      prisma.email.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.email.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Email');
    }

    return record;
  }

  async create(data: Prisma.EmailCreateInput, userId?: string) {
    
    
    

    const record = await prisma.email.create({ data });

    await eventBus.emit('emails.created', {
      type: 'emails.created',
      source: 'email-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'emails', record.id);

    log.info('Email created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.EmailUpdateInput, userId?: string) {
    const existing = await prisma.email.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Email');
    }

    const record = await prisma.email.update({
      where: { id },
      data,
    });

    await eventBus.emit('emails.updated', {
      type: 'emails.updated',
      source: 'email-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'emails', id);

    log.info('Email updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.email.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Email');
    }

    await prisma.email.delete({ where: { id } });

    await eventBus.emit('emails.deleted', {
      type: 'emails.deleted',
      source: 'email-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'emails', id);

    log.info('Email deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.EmailWhereInput = {
      subject: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.email.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.email.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const emailService = new EmailService();
