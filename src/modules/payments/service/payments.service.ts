import { Prisma, PaymentStatus } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('PaymentsService');

export class PaymentsService {
  async findAll(params: PaginationParams, filters?: { status?: string; userId?: string; method?: string }) {
    const where: Prisma.PaymentWhereInput = {};
    if (filters?.status) where.status = filters.status as PaymentStatus;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.method) where.method = filters.method;
    const [data, total] = await Promise.all([
      prisma.payment.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' }, include: { invoice: true } }),
      prisma.payment.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const payment = await prisma.payment.findUnique({ where: { id }, include: { invoice: true } });
    if (!payment) throw new NotFoundError('Payment');
    return payment;
  }

  async createPaymentIntent(data: { amount: number; currency?: string; description?: string; invoiceId?: string; method?: string }, userId: string) {
    const payment = await prisma.payment.create({
      data: {
        amount: data.amount,
        currency: data.currency || 'EUR',
        description: data.description,
        invoiceId: data.invoiceId,
        method: data.method,
        userId,
        status: 'PENDING',
      },
    });
    await eventBus.emit('payments.intent_created', { type: 'payments.intent_created', source: 'payments-service', data: { id: payment.id, amount: data.amount }, userId });
    await createAuditEntry(userId, 'PAYMENT_INTENT_CREATED', 'payment', payment.id);
    log.info('Payment intent created', { id: payment.id, amount: data.amount });
    return payment;
  }

  async processStripeWebhook(event: { type: string; data: { object: { id: string; status: string; metadata?: Record<string, string> } } }) {
    const stripeObj = event.data.object;
    const payment = await prisma.payment.findFirst({ where: { stripePaymentId: stripeObj.id } });
    if (!payment) {
      log.warn('Stripe webhook: payment not found', { stripeId: stripeObj.id });
      return;
    }

    let newStatus: PaymentStatus = 'PENDING';
    if (event.type === 'payment_intent.succeeded') newStatus = 'COMPLETED';
    else if (event.type === 'payment_intent.payment_failed') newStatus = 'FAILED';
    else if (event.type === 'charge.refunded') newStatus = 'REFUNDED';

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: newStatus, completedAt: newStatus === 'COMPLETED' ? new Date() : undefined },
    });

    if (newStatus === 'COMPLETED' && payment.invoiceId) {
      await prisma.invoice.update({ where: { id: payment.invoiceId }, data: { status: 'PAID', paidAt: new Date() } });
    }

    await eventBus.emit('payments.status_changed', { type: 'payments.status_changed', source: 'payments-service', data: { id: payment.id, status: newStatus }, userId: payment.userId || 'system' });
    log.info('Payment status updated via webhook', { id: payment.id, status: newStatus });
  }

  async refund(paymentId: string, userId: string, reason?: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Payment');
    if (payment.status !== 'COMPLETED') throw new BadRequestError('Can only refund completed payments');

    await prisma.payment.update({ where: { id: paymentId }, data: { status: 'REFUNDED' } });
    await eventBus.emit('payments.refunded', { type: 'payments.refunded', source: 'payments-service', data: { id: paymentId, reason }, userId });
    await createAuditEntry(userId, 'PAYMENT_REFUNDED', 'payment', paymentId, { reason } as object);
    log.info('Payment refunded', { id: paymentId });
  }

  async getMyPayments(userId: string, params: PaginationParams) {
    const where: Prisma.PaymentWhereInput = { userId };
    const [data, total] = await Promise.all([
      prisma.payment.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.payment.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getRevenue(startDate?: Date, endDate?: Date) {
    const where: Prisma.PaymentWhereInput = { status: 'COMPLETED' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    const payments = await prisma.payment.findMany({ where });
    const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return { totalRevenue: total, count: payments.length, currency: 'EUR' };
  }
}

export const paymentsService = new PaymentsService();
