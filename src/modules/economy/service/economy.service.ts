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
  async getAccount(userId: string, currency = 'UPLY_COIN') {
    let account = await prisma.economyAccount.findUnique({
      where: { userId_currency: { userId, currency } },
    });
    if (!account) {
      account = await prisma.economyAccount.create({
        data: { userId, balance: 0, currency },
      });
    }
    return account;
  }

  async getBalance(userId: string, currency = 'UPLY_COIN') {
    const account = await this.getAccount(userId, currency);
    return { balance: Number(account.balance), currency: account.currency };
  }

  async getAllBalances(userId: string) {
    const accounts = await prisma.economyAccount.findMany({ where: { userId } });
    return accounts.map(a => ({ currency: a.currency, balance: Number(a.balance) }));
  }

  async deposit(userId: string, amount: number, reason: string, adminId: string, currency = 'UPLY_COIN') {
    if (amount <= 0) throw new BadRequestError('Amount must be positive');
    const account = await this.getAccount(userId, currency);
    const newBalance = Number(account.balance) + amount;
    await prisma.economyAccount.update({ where: { id: account.id }, data: { balance: newBalance } });
    const tx = await prisma.economyTransaction.create({
      data: { accountId: account.id, amount, type: 'DEPOSIT', description: reason, currency, status: 'COMPLETED' },
    });
    await eventBus.emit('economy.deposit', { type: 'economy.deposit', source: 'economy-service', data: { userId, amount, currency }, userId: adminId });
    await createAuditEntry(adminId, 'ECONOMY_DEPOSIT', 'economy', account.id, { amount, reason } as object);
    log.info('Economy deposit', { userId, amount, currency });
    return { transaction: tx, newBalance };
  }

  async withdraw(userId: string, amount: number, reason: string, currency = 'UPLY_COIN') {
    if (amount <= 0) throw new BadRequestError('Amount must be positive');
    const account = await this.getAccount(userId, currency);
    if (Number(account.balance) < amount) throw new BadRequestError('Insufficient balance');
    const newBalance = Number(account.balance) - amount;
    await prisma.economyAccount.update({ where: { id: account.id }, data: { balance: newBalance } });
    const tx = await prisma.economyTransaction.create({
      data: { accountId: account.id, amount, type: 'WITHDRAWAL', description: reason, currency, status: 'COMPLETED' },
    });
    await createAuditEntry(userId, 'ECONOMY_WITHDRAWAL', 'economy', account.id, { amount, reason } as object);
    return { transaction: tx, newBalance };
  }

  async transfer(fromUserId: string, toUserId: string, amount: number, description: string, currency = 'UPLY_COIN') {
    if (amount <= 0) throw new BadRequestError('Amount must be positive');
    if (fromUserId === toUserId) throw new BadRequestError('Cannot transfer to yourself');
    const fromAccount = await this.getAccount(fromUserId, currency);
    const toAccount = await this.getAccount(toUserId, currency);
    if (Number(fromAccount.balance) < amount) throw new BadRequestError('Insufficient balance');

    const fromBalance = Number(fromAccount.balance) - amount;
    const toBalance = Number(toAccount.balance) + amount;

    await prisma.$transaction([
      prisma.economyAccount.update({ where: { id: fromAccount.id }, data: { balance: fromBalance } }),
      prisma.economyAccount.update({ where: { id: toAccount.id }, data: { balance: toBalance } }),
      prisma.economyTransaction.create({
        data: { accountId: fromAccount.id, amount, type: 'TRANSFER_OUT', description, currency, toAccountId: toAccount.id, status: 'COMPLETED' },
      }),
      prisma.economyTransaction.create({
        data: { accountId: toAccount.id, amount, type: 'TRANSFER_IN', description, currency, fromAccountId: fromAccount.id, status: 'COMPLETED' },
      }),
    ]);

    await eventBus.emit('economy.transfer', { type: 'economy.transfer', source: 'economy-service', data: { from: fromUserId, to: toUserId, amount, currency }, userId: fromUserId });
    await createAuditEntry(fromUserId, 'ECONOMY_TRANSFER', 'economy', fromAccount.id, { to: toUserId, amount } as object);
    log.info('Economy transfer', { from: fromUserId, to: toUserId, amount, currency });
    return { newBalance: fromBalance };
  }

  async purchaseCurrency(userId: string, amount: number, paymentId: string, currency = 'UPLY_COIN') {
    const account = await this.getAccount(userId, currency);
    const newBalance = Number(account.balance) + amount;
    await prisma.economyAccount.update({ where: { id: account.id }, data: { balance: newBalance } });
    const tx = await prisma.economyTransaction.create({
      data: { accountId: account.id, amount, type: 'PURCHASE', description: 'Currency purchase via payment ' + paymentId, currency, status: 'COMPLETED' },
    });
    await createAuditEntry(userId, 'CURRENCY_PURCHASED', 'economy', account.id, { amount, paymentId } as object);
    return { transaction: tx, newBalance };
  }

  async getTransactionHistory(userId: string, params: PaginationParams, currency = 'UPLY_COIN') {
    const account = await this.getAccount(userId, currency);
    const where: Prisma.EconomyTransactionWhereInput = { accountId: account.id };
    const [data, total] = await Promise.all([
      prisma.economyTransaction.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.economyTransaction.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getCurrencies() {
    return prisma.economyCurrency.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async getLeaderboard(limit: number, currency = 'UPLY_COIN') {
    return prisma.economyAccount.findMany({
      where: { currency },
      take: limit,
      orderBy: { balance: 'desc' },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });
  }

  async reward(userId: string, amount: number, reason: string, currency = 'UPLY_COIN') {
    return this.deposit(userId, amount, 'REWARD: ' + reason, 'system', currency);
  }

  async deduct(userId: string, amount: number, reason: string, currency = 'UPLY_COIN') {
    return this.withdraw(userId, amount, 'DEDUCTION: ' + reason, currency);
  }

  async dailyBonus(userId: string, currency = 'UPLY_COIN') {
    const account = await this.getAccount(userId, currency);
    const lastTx = await prisma.economyTransaction.findFirst({
      where: { accountId: account.id, type: 'DAILY_BONUS' },
      orderBy: { createdAt: 'desc' },
    });
    if (lastTx) {
      const hoursSince = (Date.now() - lastTx.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) throw new BadRequestError('Daily bonus already claimed. Come back in ' + Math.ceil(24 - hoursSince) + ' hours.');
    }
    const bonusAmount = 100;
    const newBalance = Number(account.balance) + bonusAmount;
    await prisma.economyAccount.update({ where: { id: account.id }, data: { balance: newBalance } });
    await prisma.economyTransaction.create({
      data: { accountId: account.id, amount: bonusAmount, type: 'DAILY_BONUS', description: 'Daily login bonus', currency, status: 'COMPLETED' },
    });
    return { bonus: bonusAmount, newBalance };
  }

  async shopPurchase(userId: string, itemId: string, price: number, currency = 'UPLY_COIN') {
    const account = await this.getAccount(userId, currency);
    if (Number(account.balance) < price) throw new BadRequestError('Insufficient balance');
    const newBalance = Number(account.balance) - price;
    await prisma.economyAccount.update({ where: { id: account.id }, data: { balance: newBalance } });
    const tx = await prisma.economyTransaction.create({
      data: { accountId: account.id, amount: price, type: 'SHOP_PURCHASE', description: 'Purchased item: ' + itemId, currency, status: 'COMPLETED', reference: itemId },
    });
    await eventBus.emit('economy.shop_purchase', { type: 'economy.shop_purchase', source: 'economy-service', data: { userId, itemId, price, currency }, userId });
    return { transaction: tx, newBalance };
  }
}

export const economyService = new EconomyService();
