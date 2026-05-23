import { Prisma, TicketType, TicketPriority, TicketStatus } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('TicketsService');

export class TicketsService {
  async findAll(params: PaginationParams, filters?: { status?: string; priority?: string; type?: string; assigneeId?: string }) {
    const where: Prisma.TicketWhereInput = {};
    if (filters?.status) where.status = filters.status as TicketStatus;
    if (filters?.priority) where.priority = filters.priority as TicketPriority;
    if (filters?.type) where.type = filters.type as TicketType;
    if (filters?.assigneeId) where.assigneeId = filters.assigneeId;

    const [data, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          creator: { select: { id: true, username: true, displayName: true, avatar: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatar: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, username: true, displayName: true, avatar: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundError('Ticket');
    return ticket;
  }

  async create(data: { title: string; description: string; type: string; priority?: string; category?: string }, userId: string) {
    const ticket = await prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type as TicketType,
        priority: (data.priority as TicketPriority) || 'MEDIUM',
        status: 'OPEN',
        creatorId: userId,
        category: data.category,
      },
      include: { creator: { select: { id: true, username: true, displayName: true } } },
    });

    await eventBus.emit('tickets.created', { type: 'tickets.created', source: 'tickets-service', data: { id: ticket.id, ticketType: data.type }, userId });
    await createAuditEntry(userId, 'TICKET_CREATED', 'ticket', ticket.id);
    log.info('Ticket created', { id: ticket.id, type: data.type });
    return ticket;
  }

  async addMessage(ticketId: string, content: string, userId: string, isStaff: boolean) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError('Ticket');
    if (ticket.status === 'CLOSED') throw new BadRequestError('Cannot add messages to closed tickets');

    const message = await prisma.ticketMessage.create({
      data: { ticketId, authorId: userId, content, isStaff },
      include: { author: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });

    const newStatus: TicketStatus = isStaff ? 'WAITING_RESPONSE' : 'IN_PROGRESS';
    await prisma.ticket.update({ where: { id: ticketId }, data: { status: newStatus, updatedAt: new Date() } });

    await eventBus.emit('tickets.message_added', { type: 'tickets.message_added', source: 'tickets-service', data: { ticketId, messageId: message.id }, userId });
    return message;
  }

  async assign(ticketId: string, assigneeId: string, adminId: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError('Ticket');

    await prisma.ticket.update({ where: { id: ticketId }, data: { assigneeId, status: 'IN_PROGRESS' } });
    await eventBus.emit('tickets.assigned', { type: 'tickets.assigned', source: 'tickets-service', data: { ticketId, assigneeId }, userId: adminId });
    await createAuditEntry(adminId, 'TICKET_ASSIGNED', 'ticket', ticketId, { assigneeId } as object);
    log.info('Ticket assigned', { ticketId, assigneeId });
  }

  async escalate(ticketId: string, userId: string, reason: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError('Ticket');

    await prisma.ticket.update({ where: { id: ticketId }, data: { priority: 'CRITICAL' } });
    await prisma.ticketMessage.create({
      data: { ticketId, authorId: userId, content: 'Ticket escalated: ' + reason, isStaff: true },
    });
    await eventBus.emit('tickets.escalated', { type: 'tickets.escalated', source: 'tickets-service', data: { ticketId, reason }, userId });
    await createAuditEntry(userId, 'TICKET_ESCALATED', 'ticket', ticketId, { reason } as object);
    log.warn('Ticket escalated', { ticketId, reason });
  }

  async resolve(ticketId: string, userId: string, resolution: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError('Ticket');

    await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
    await prisma.ticketMessage.create({
      data: { ticketId, authorId: userId, content: 'Resolved: ' + resolution, isStaff: true },
    });
    await eventBus.emit('tickets.resolved', { type: 'tickets.resolved', source: 'tickets-service', data: { ticketId }, userId });
    await createAuditEntry(userId, 'TICKET_RESOLVED', 'ticket', ticketId);
    log.info('Ticket resolved', { ticketId });
  }

  async close(ticketId: string, userId: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError('Ticket');
    if (ticket.status === 'CLOSED') throw new BadRequestError('Ticket is already closed');

    await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'CLOSED', closedAt: new Date() } });
    await eventBus.emit('tickets.closed', { type: 'tickets.closed', source: 'tickets-service', data: { ticketId }, userId });
    await createAuditEntry(userId, 'TICKET_CLOSED', 'ticket', ticketId);
  }

  async reopen(ticketId: string, userId: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError('Ticket');
    if (ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED') throw new BadRequestError('Ticket is not closed');

    await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'OPEN' } });
    await eventBus.emit('tickets.reopened', { type: 'tickets.reopened', source: 'tickets-service', data: { ticketId }, userId });
    await createAuditEntry(userId, 'TICKET_REOPENED', 'ticket', ticketId);
  }

  async setPriority(ticketId: string, priority: string, userId: string) {
    await prisma.ticket.update({ where: { id: ticketId }, data: { priority: priority as TicketPriority } });
    await createAuditEntry(userId, 'TICKET_PRIORITY_CHANGED', 'ticket', ticketId, { priority } as object);
  }

  async getMyTickets(userId: string, params: PaginationParams) {
    const where: Prisma.TicketWhereInput = { creatorId: userId };
    const [data, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { messages: true } } },
      }),
      prisma.ticket.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getAssignedTickets(userId: string, params: PaginationParams) {
    const where: Prisma.TicketWhereInput = { assigneeId: userId };
    const [data, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: { creator: { select: { id: true, username: true, displayName: true } }, _count: { select: { messages: true } } },
      }),
      prisma.ticket.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getStats() {
    const [total, open, inProgress, resolved, closed] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } }),
    ]);
    return { total, open, inProgress, resolved, closed };
  }
}

export const ticketsService = new TicketsService();
