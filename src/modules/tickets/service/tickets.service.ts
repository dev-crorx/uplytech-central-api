// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('TicketsService');

const TICKET_TYPES = ['SUPPORT', 'SECURITY', 'REPORT', 'BUG', 'FEATURE_REQUEST', 'BILLING', 'ABUSE'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_USER', 'WAITING_ON_STAFF', 'ESCALATED', 'RESOLVED', 'CLOSED'] as const;

export class TicketsService {
  async findAll(params: PaginationParams, filters?: { status?: string; priority?: string; type?: string; assigneeId?: string }) {
    const where: Prisma.TicketWhereInput = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.type) where.type = filters.type;
    if (filters?.assigneeId) where.assigneeId = filters.assigneeId;

    const [data, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          creator: { select: { id: true, username: true, displayName: true, avatar: true } },
          assignee: { select: { id: true, username: true, displayName: true, avatar: true } },
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
        assignee: { select: { id: true, username: true, displayName: true, avatar: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundError('Ticket');
    return ticket;
  }

  async create(data: { title: string; description: string; type: string; priority?: string; category?: string }, userId: string) {
    if (!TICKET_TYPES.includes(data.type as typeof TICKET_TYPES[number])) {
      throw new BadRequestError('Invalid ticket type. Valid: ' + TICKET_TYPES.join(', '));
    }

    const ticket = await prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority || 'MEDIUM',
        status: 'OPEN',
        creatorId: userId,
      },
      include: { creator: { select: { id: true, username: true, displayName: true } } },
    });

    await eventBus.emit('tickets.created', { type: 'tickets.created', source: 'tickets-service', data: { id: ticket.id, type: data.type }, userId });
    await createAuditEntry(userId, 'TICKET_CREATED', 'ticket', ticket.id);
    log.info('Ticket created', { id: ticket.id, type: data.type });
    return ticket;
  }

  async addMessage(ticketId: string, content: string, userId: string, isStaff: boolean) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError('Ticket');
    if (ticket.status === 'CLOSED') throw new BadRequestError('Cannot add messages to closed tickets');

    const message = await prisma.ticketMessage.create({
      data: { ticketId, userId, content, isStaff },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });

    const newStatus = isStaff ? 'WAITING_ON_USER' : 'WAITING_ON_STAFF';
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

    await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'ESCALATED', priority: 'CRITICAL' } });
    await prisma.ticketMessage.create({
      data: { ticketId, userId, content: 'Ticket escalated: ' + reason, isStaff: true },
    });
    await eventBus.emit('tickets.escalated', { type: 'tickets.escalated', source: 'tickets-service', data: { ticketId, reason }, userId });
    await createAuditEntry(userId, 'TICKET_ESCALATED', 'ticket', ticketId, { reason } as object);
    log.warn('Ticket escalated', { ticketId, reason });
  }

  async resolve(ticketId: string, userId: string, resolution: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError('Ticket');

    await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'RESOLVED' } });
    await prisma.ticketMessage.create({
      data: { ticketId, userId, content: 'Resolved: ' + resolution, isStaff: true },
    });
    await eventBus.emit('tickets.resolved', { type: 'tickets.resolved', source: 'tickets-service', data: { ticketId }, userId });
    await createAuditEntry(userId, 'TICKET_RESOLVED', 'ticket', ticketId);
    log.info('Ticket resolved', { ticketId });
  }

  async close(ticketId: string, userId: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError('Ticket');
    if (ticket.status === 'CLOSED') throw new BadRequestError('Ticket is already closed');

    await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'CLOSED' } });
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
    if (!PRIORITIES.includes(priority as typeof PRIORITIES[number])) {
      throw new BadRequestError('Invalid priority. Valid: ' + PRIORITIES.join(', '));
    }
    await prisma.ticket.update({ where: { id: ticketId }, data: { priority } });
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
    const [total, open, inProgress, escalated, resolved, closed] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: 'ESCALATED' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } }),
    ]);
    return { total, open, inProgress, escalated, resolved, closed };
  }
}

export const ticketsService = new TicketsService();