import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('PaymentsService');

export class PaymentsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.PaymentWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.PaymentOrderByWithRelationInput,
        
      }),
      prisma.payment.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.payment.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Payment');
    }

    return record;
  }

  async create(data: Prisma.PaymentCreateInput, userId?: string) {
    
    
    

    const record = await prisma.payment.create({ data });

    await eventBus.emit('payments.created', {
      type: 'payments.created',
      source: 'payments-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'payments', record.id);

    log.info('Payment created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.PaymentUpdateInput, userId?: string) {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Payment');
    }

    const record = await prisma.payment.update({
      where: { id },
      data,
    });

    await eventBus.emit('payments.updated', {
      type: 'payments.updated',
      source: 'payments-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'payments', id);

    log.info('Payment updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Payment');
    }

    await prisma.payment.delete({ where: { id } });

    await eventBus.emit('payments.deleted', {
      type: 'payments.deleted',
      source: 'payments-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'payments', id);

    log.info('Payment deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.PaymentWhereInput = {
      id: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const paymentsService = new PaymentsService();
