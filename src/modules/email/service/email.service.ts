import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';
import { config } from '../../../core/config';

const log = new ModuleLogger('EmailService');

export class EmailService {
  async getInbox(userId: string, params: PaginationParams) {
    const where: Prisma.EmailWhereInput = { recipientId: userId };
    const [data, total] = await Promise.all([
      prisma.email.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { sentAt: 'desc' },
        include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } }),
      prisma.email.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getSent(userId: string, params: PaginationParams) {
    const where: Prisma.EmailWhereInput = { senderId: userId };
    const [data, total] = await Promise.all([
      prisma.email.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { sentAt: 'desc' },
        include: { user: { select: { id: true, username: true, displayName: true } } } }),
      prisma.email.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string, userId: string) {
    const email = await prisma.email.findUnique({ where: { id },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } });
    if (!email) throw new NotFoundError('Email');
    if (email.senderId !== userId && email.recipientId !== userId) throw new BadRequestError('Not authorized');
    if (email.recipientId === userId && !email.isRead) {
      await prisma.email.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
    }
    return email;
  }

  async send(data: { to: string; subject: string; body: string; html?: string; isInternal?: boolean }, userId: string) {
    const recipient = await prisma.user.findFirst({ where: { OR: [{ email: data.to }, { id: data.to }, { username: data.to }] } });
    if (!recipient) throw new NotFoundError('Recipient');
    const email = await prisma.email.create({
      data: { userId, direction: 'OUTGOING', fromAddress: 'internal', toAddress: recipient.email,
        subject: data.subject, body: data.body, senderId: userId, recipientId: recipient.id,
        isInternal: data.isInternal !== false, sentAt: new Date(), status: 'SENT' },
    });
    await eventBus.emit('email.sent', { type: 'email.sent', source: 'email-service', data: { id: email.id, to: recipient.id }, userId });
    log.info('Email sent', { id: email.id, from: userId, to: recipient.id });
    return email;
  }

  async sendExternal(data: { to: string; subject: string; body: string; html?: string; templateId?: string }, userId: string) {
    const email = await prisma.email.create({
      data: { userId, direction: 'OUTGOING', fromAddress: 'noreply@uplytech.com', toAddress: data.to,
        subject: data.subject, body: data.body, senderId: userId,
        externalRecipient: data.to, isInternal: false, sentAt: new Date(), status: 'SENT' },
    });
    await eventBus.emit('email.external_sent', { type: 'email.external_sent', source: 'email-service', data: { id: email.id, to: data.to }, userId });
    log.info('External email queued', { to: data.to });
    return email;
  }

  async delete(id: string, userId: string) {
    const email = await prisma.email.findUnique({ where: { id } });
    if (!email) throw new NotFoundError('Email');
    if (email.senderId !== userId && email.recipientId !== userId) throw new BadRequestError('Not authorized');
    await prisma.email.delete({ where: { id } });
  }

  async markAsRead(id: string, userId: string) {
    const email = await prisma.email.findUnique({ where: { id } });
    if (!email || email.recipientId !== userId) throw new NotFoundError('Email');
    await prisma.email.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  }

  async markAsUnread(id: string, userId: string) {
    const email = await prisma.email.findUnique({ where: { id } });
    if (!email || email.recipientId !== userId) throw new NotFoundError('Email');
    await prisma.email.update({ where: { id }, data: { isRead: false, readAt: undefined } });
  }

  async getUnreadCount(userId: string) {
    return prisma.email.count({ where: { recipientId: userId, isRead: false } });
  }

  async getTemplates() {
    return prisma.emailTemplate.findMany({ orderBy: { name: 'asc' } });
  }

  async createTemplate(data: { name: string; subject: string; body: string; html?: string }, userId: string) {
    const tmpl = await prisma.emailTemplate.create({ data: { name: data.name, subject: data.subject, body: data.body, html: data.html || undefined } });
    await createAuditEntry(userId, 'EMAIL_TEMPLATE_CREATED', 'email', tmpl.id);
    return tmpl;
  }

  async search(userId: string, query: string, params: PaginationParams) {
    const where: Prisma.EmailWhereInput = { OR: [{ recipientId: userId }, { senderId: userId }], AND: [{ OR: [{ subject: { contains: query } }, { body: { contains: query } }] }] };
    const [data, total] = await Promise.all([
      prisma.email.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { sentAt: 'desc' } }),
      prisma.email.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }
}

export const emailService = new EmailService();