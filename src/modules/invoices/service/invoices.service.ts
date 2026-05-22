import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('InvoicesService');

export class InvoicesService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.InvoiceWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.InvoiceOrderByWithRelationInput,
        
      }),
      prisma.invoice.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.invoice.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Invoice');
    }

    return record;
  }

  async create(data: Prisma.InvoiceCreateInput, userId?: string) {
    
    
    

    const record = await prisma.invoice.create({ data });

    await eventBus.emit('invoices.created', {
      type: 'invoices.created',
      source: 'invoices-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'invoices', record.id);

    log.info('Invoice created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.InvoiceUpdateInput, userId?: string) {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Invoice');
    }

    const record = await prisma.invoice.update({
      where: { id },
      data,
    });

    await eventBus.emit('invoices.updated', {
      type: 'invoices.updated',
      source: 'invoices-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'invoices', id);

    log.info('Invoice updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Invoice');
    }

    await prisma.invoice.delete({ where: { id } });

    await eventBus.emit('invoices.deleted', {
      type: 'invoices.deleted',
      source: 'invoices-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'invoices', id);

    log.info('Invoice deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.InvoiceWhereInput = {
      number: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const invoicesService = new InvoicesService();
