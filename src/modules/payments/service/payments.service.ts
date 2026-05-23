// @ts-nocheck
import { Prisma } from '@prisma/client';
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
    if (filters?.status) where.status = filters.status;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.method) where.method = filters.method;
    const [data, total] = await Promise.all([
      prisma.payment.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, displayName: true, email: true } } } }),
      prisma.payment.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const payment = await prisma.payment.findUnique({ where: { id },
      include: { user: { select: { id: true, username: true, displayName: true, email: true } }, invoice: true } });
    if (!payment) throw new NotFoundError('Payment');
    return payment;
  }

  async createPaymentIntent(data: { amount: number; currency: string; userId: string; description?: string; invoiceId?: string; method?: string }) {
    const payment = await prisma.payment.create({
      data: { amount: data.amount, currency: data.currency || 'EUR', userId: data.userId, description: data.description || null,
        invoiceId: data.invoiceId || null, method: data.method || 'STRIPE', status: 'PENDING',
        stripePaymentIntentId: 'pi_' + Date.now() + '_' + Math.random().toString(36).substring(7) },
    });
    await eventBus.emit('payments.created', { type: 'payments.created', source: 'payments-service', data: { id: payment.id, amount: data.amount }, userId: data.userId });
    await createAuditEntry(data.userId, 'PAYMENT_CREATED', 'payment', payment.id, { amount: data.amount, currency: data.currency } as object);
    log.info('Payment intent created', { id: payment.id, amount: data.amount });
    return payment;
  }

  async confirmPayment(paymentId: string, userId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Payment');
    if (payment.status !== 'PENDING') throw new BadRequestError('Payment is not pending');
    const updated = await prisma.payment.update({ where: { id: paymentId }, data: { status: 'COMPLETED', completedAt: new Date() } });
    if (payment.invoiceId) {
      await prisma.invoice.update({ where: { id: payment.invoiceId }, data: { status: 'PAID', paidAt: new Date() } });
    }
    await eventBus.emit('payments.completed', { type: 'payments.completed', source: 'payments-service', data: { id: paymentId }, userId });
    await createAuditEntry(userId, 'PAYMENT_CONFIRMED', 'payment', paymentId);
    return updated;
  }

  async refund(paymentId: string, amount: number | undefined, reason: string, adminId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Payment');
    if (payment.status !== 'COMPLETED') throw new BadRequestError('Can only refund completed payments');
    const refundAmount = amount || Number(payment.amount);
    const updated = await prisma.payment.update({ where: { id: paymentId }, data: { status: refundAmount >= Number(payment.amount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED', refundedAmount: refundAmount, refundReason: reason } });
    await eventBus.emit('payments.refunded', { type: 'payments.refunded', source: 'payments-service', data: { id: paymentId, amount: refundAmount, reason }, userId: adminId });
    await createAuditEntry(adminId, 'PAYMENT_REFUNDED', 'payment', paymentId, { amount: refundAmount, reason } as object);
    log.info('Payment refunded', { id: paymentId, amount: refundAmount });
    return updated;
  }

  async cancelPayment(paymentId: string, userId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Payment');
    if (payment.status !== 'PENDING') throw new BadRequestError('Can only cancel pending payments');
    await prisma.payment.update({ where: { id: paymentId }, data: { status: 'CANCELLED' } });
    await createAuditEntry(userId, 'PAYMENT_CANCELLED', 'payment', paymentId);
  }

  async handleStripeWebhook(event: { type: string; data: { object: { id: string; status: string; metadata?: Record<string, string> } } }) {
    const { type: eventType, data: { object: stripeObj } } = event;
    log.info('Stripe webhook received', { type: eventType, id: stripeObj.id });
    if (eventType === 'payment_intent.succeeded') {
      const payment = await prisma.payment.findFirst({ where: { stripePaymentIntentId: stripeObj.id } });
      if (payment) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
        await eventBus.emit('payments.completed', { type: 'payments.completed', source: 'payments-service', data: { id: payment.id }, userId: payment.userId });
      }
    } else if (eventType === 'payment_intent.payment_failed') {
      const payment = await prisma.payment.findFirst({ where: { stripePaymentIntentId: stripeObj.id } });
      if (payment) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
        await eventBus.emit('payments.failed', { type: 'payments.failed', source: 'payments-service', data: { id: payment.id }, userId: payment.userId });
      }
    }
  }

  async getMyPayments(userId: string, params: PaginationParams) {
    const where: Prisma.PaymentWhereInput = { userId };
    const [data, total] = await Promise.all([
      prisma.payment.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.payment.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getStats(startDate?: Date, endDate?: Date) {
    const where: Prisma.PaymentWhereInput = { status: 'COMPLETED' };
    if (startDate || endDate) { where.createdAt = {}; if (startDate) where.createdAt.gte = startDate; if (endDate) where.createdAt.lte = endDate; }
    const payments = await prisma.payment.findMany({ where, select: { amount: true, currency: true } });
    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const count = payments.length;
    return { totalRevenue, transactionCount: count, averageTransaction: count > 0 ? totalRevenue / count : 0 };
  }
}

export const paymentsService = new PaymentsService();