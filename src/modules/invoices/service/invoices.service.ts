// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('InvoicesService');

export class InvoicesService {
  async findAll(params: PaginationParams, filters?: { status?: string; userId?: string }) {
    const where: Prisma.InvoiceWhereInput = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.userId) where.userId = filters.userId;
    const [data, total] = await Promise.all([
      prisma.invoice.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, displayName: true, email: true } } } }),
      prisma.invoice.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id },
      include: { user: { select: { id: true, username: true, displayName: true, email: true } }, payments: true } });
    if (!invoice) throw new NotFoundError('Invoice');
    return invoice;
  }

  async create(data: { userId: string; items: Array<{ description: string; quantity: number; unitPrice: number }>; dueDate: string; taxRate?: number; notes?: string }, adminId: string) {
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxRate = data.taxRate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    const invoiceNumber = 'INV-' + Date.now().toString(36).toUpperCase();
    const invoice = await prisma.invoice.create({
      data: { invoiceNumber, userId: data.userId, items: data.items as object, subtotal, taxRate, taxAmount, total,
        currency: 'EUR', status: 'PENDING', dueDate: new Date(data.dueDate), notes: data.notes || null },
    });
    await eventBus.emit('invoices.created', { type: 'invoices.created', source: 'invoices-service', data: { id: invoice.id, total }, userId: adminId });
    await createAuditEntry(adminId, 'INVOICE_CREATED', 'invoice', invoice.id, { total, userId: data.userId } as object);
    log.info('Invoice created', { id: invoice.id, number: invoiceNumber, total });
    return invoice;
  }

  async markAsPaid(id: string, userId: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundError('Invoice');
    if (invoice.status === 'PAID') throw new BadRequestError('Invoice is already paid');
    await prisma.invoice.update({ where: { id }, data: { status: 'PAID', paidAt: new Date() } });
    await createAuditEntry(userId, 'INVOICE_MARKED_PAID', 'invoice', id);
  }

  async markAsOverdue(id: string, userId: string) {
    await prisma.invoice.update({ where: { id }, data: { status: 'OVERDUE' } });
    await createAuditEntry(userId, 'INVOICE_MARKED_OVERDUE', 'invoice', id);
  }

  async cancel(id: string, userId: string) {
    await prisma.invoice.update({ where: { id }, data: { status: 'CANCELLED' } });
    await createAuditEntry(userId, 'INVOICE_CANCELLED', 'invoice', id);
  }

  async sendReminder(id: string, userId: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { user: { select: { email: true } } } });
    if (!invoice) throw new NotFoundError('Invoice');
    await eventBus.emit('invoices.reminder_sent', { type: 'invoices.reminder_sent', source: 'invoices-service', data: { id, email: invoice.user.email }, userId });
    log.info('Invoice reminder sent', { id });
  }

  async getMyInvoices(userId: string, params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.invoice.findMany({ where: { userId }, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.invoice.count({ where: { userId } }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getStats(startDate?: Date, endDate?: Date) {
    const where: Prisma.InvoiceWhereInput = {};
    if (startDate || endDate) { where.createdAt = {}; if (startDate) where.createdAt.gte = startDate; if (endDate) where.createdAt.lte = endDate; }
    const [total, paid, pending, overdue] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.count({ where: { ...where, status: 'PAID' } }),
      prisma.invoice.count({ where: { ...where, status: 'PENDING' } }),
      prisma.invoice.count({ where: { ...where, status: 'OVERDUE' } }),
    ]);
    const paidInvoices = await prisma.invoice.findMany({ where: { ...where, status: 'PAID' }, select: { total: true } });
    const totalRevenue = paidInvoices.reduce((s, i) => s + Number(i.total), 0);
    return { total, paid, pending, overdue, totalRevenue };
  }
}

export const invoicesService = new InvoicesService();