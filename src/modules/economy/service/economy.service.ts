// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('EconomyService');

export class EconomyService {
  async getAccount(userId: string) {
    let account = await prisma.economyAccount.findUnique({ where: { userId } });
    if (!account) {
      account = await prisma.economyAccount.create({ data: { userId, balance: 0, currency: 'UPLY_COINS' } });
    }
    return account;
  }

  async getBalance(userId: string) {
    const account = await this.getAccount(userId);
    return { balance: Number(account.balance), currency: account.currency };
  }

  async deposit(userId: string, amount: number, reason: string, adminId: string) {
    if (amount <= 0) throw new BadRequestError('Amount must be positive');
    const account = await this.getAccount(userId);
    const newBalance = Number(account.balance) + amount;
    await prisma.economyAccount.update({ where: { id: account.id }, data: { balance: newBalance } });
    const tx = await prisma.economyTransaction.create({
      data: { fromAccountId: null, toAccountId: account.id, amount, type: 'DEPOSIT', description: reason, status: 'COMPLETED' },
    });
    await eventBus.emit('economy.deposit', { type: 'economy.deposit', source: 'economy-service', data: { userId, amount }, userId: adminId });
    await createAuditEntry(adminId, 'ECONOMY_DEPOSIT', 'economy', account.id, { amount, reason } as object);
    log.info('Economy deposit', { userId, amount });
    return { transaction: tx, newBalance };
  }

  async withdraw(userId: string, amount: number, reason: string) {
    if (amount <= 0) throw new BadRequestError('Amount must be positive');
    const account = await this.getAccount(userId);
    if (Number(account.balance) < amount) throw new BadRequestError('Insufficient balance');
    const newBalance = Number(account.balance) - amount;
    await prisma.economyAccount.update({ where: { id: account.id }, data: { balance: newBalance } });
    const tx = await prisma.economyTransaction.create({
      data: { fromAccountId: account.id, toAccountId: null, amount, type: 'WITHDRAWAL', description: reason, status: 'COMPLETED' },
    });
    await createAuditEntry(userId, 'ECONOMY_WITHDRAWAL', 'economy', account.id, { amount, reason } as object);
    return { transaction: tx, newBalance };
  }

  async transfer(fromUserId: string, toUserId: string, amount: number, description: string) {
    if (amount <= 0) throw new BadRequestError('Amount must be positive');
    if (fromUserId === toUserId) throw new BadRequestError('Cannot transfer to yourself');
    const fromAccount = await this.getAccount(fromUserId);
    const toAccount = await this.getAccount(toUserId);
    if (Number(fromAccount.balance) < amount) throw new BadRequestError('Insufficient balance');

    const fromBalance = Number(fromAccount.balance) - amount;
    const toBalance = Number(toAccount.balance) + amount;
    await prisma.$transaction([
      prisma.economyAccount.update({ where: { id: fromAccount.id }, data: { balance: fromBalance } }),
      prisma.economyAccount.update({ where: { id: toAccount.id }, data: { balance: toBalance } }),
    ]);
    const tx = await prisma.economyTransaction.create({
      data: { fromAccountId: fromAccount.id, toAccountId: toAccount.id, amount, type: 'TRANSFER', description, status: 'COMPLETED' },
    });
    await eventBus.emit('economy.transfer', { type: 'economy.transfer', source: 'economy-service', data: { from: fromUserId, to: toUserId, amount }, userId: fromUserId });
    await createAuditEntry(fromUserId, 'ECONOMY_TRANSFER', 'economy', tx.id, { to: toUserId, amount } as object);
    log.info('Economy transfer', { from: fromUserId, to: toUserId, amount });
    return { transaction: tx, newBalance: fromBalance };
  }

  async purchaseCurrency(userId: string, amount: number, paymentId: string) {
    const account = await this.getAccount(userId);
    const newBalance = Number(account.balance) + amount;
    await prisma.economyAccount.update({ where: { id: account.id }, data: { balance: newBalance } });
    const tx = await prisma.economyTransaction.create({
      data: { fromAccountId: null, toAccountId: account.id, amount, type: 'PURCHASE', description: 'Currency purchase via payment ' + paymentId, status: 'COMPLETED' },
    });
    await createAuditEntry(userId, 'CURRENCY_PURCHASED', 'economy', account.id, { amount, paymentId } as object);
    return { transaction: tx, newBalance };
  }

  async getTransactionHistory(userId: string, params: PaginationParams) {
    const account = await this.getAccount(userId);
    const where: Prisma.EconomyTransactionWhereInput = { OR: [{ fromAccountId: account.id }, { toAccountId: account.id }] };
    const [data, total] = await Promise.all([
      prisma.economyTransaction.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.economyTransaction.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getCurrencies() {
    return prisma.economyCurrency.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async getLeaderboard(limit: number) {
    return prisma.economyAccount.findMany({
      take: limit, orderBy: { balance: 'desc' },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });
  }
}

export const economyService = new EconomyService();