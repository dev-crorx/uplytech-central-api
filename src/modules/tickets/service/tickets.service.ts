import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('TicketsService');

export class TicketsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.TicketWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.TicketOrderByWithRelationInput,
        include: { creator: { select: { id: true, username: true, displayName: true, avatar: true } }, messages: { take: 20, orderBy: { createdAt: 'asc' } } }
      }),
      prisma.ticket.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.ticket.findUnique({
      where: { id },
      include: { creator: { select: { id: true, username: true, displayName: true, avatar: true } }, messages: { take: 20, orderBy: { createdAt: 'asc' } } }
    });

    if (!record) {
      throw new NotFoundError('Ticket');
    }

    return record;
  }

  async create(data: Prisma.TicketCreateInput, userId?: string) {
    
    
    (data as Record<string, unknown>).creator = { connect: { id: userId || '' } };

    const record = await prisma.ticket.create({ data });

    await eventBus.emit('tickets.created', {
      type: 'tickets.created',
      source: 'tickets-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'tickets', record.id);

    log.info('Ticket created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.TicketUpdateInput, userId?: string) {
    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Ticket');
    }

    const record = await prisma.ticket.update({
      where: { id },
      data,
    });

    await eventBus.emit('tickets.updated', {
      type: 'tickets.updated',
      source: 'tickets-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'tickets', id);

    log.info('Ticket updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Ticket');
    }

    await prisma.ticket.delete({ where: { id } });

    await eventBus.emit('tickets.deleted', {
      type: 'tickets.deleted',
      source: 'tickets-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'tickets', id);

    log.info('Ticket deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.TicketWhereInput = {
      title: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.ticket.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const ticketsService = new TicketsService();
