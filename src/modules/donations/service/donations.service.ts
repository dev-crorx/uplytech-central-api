// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('DonationsService');

export class DonationsService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.donation.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.donation.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.donation.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Donations');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.donation.create({ data: data as Prisma.DonationCreateInput });
    await eventBus.emit('donations.created', { type: 'donations.created', source: 'donations-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'DONATIONS_CREATED', 'donations', item.id);
    log.info('Donations created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.donation.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Donations');
    const updated = await prisma.donation.update({ where: { id }, data: data as Prisma.DonationUpdateInput });
    await createAuditEntry(userId, 'DONATIONS_UPDATED', 'donations', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.donation.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Donations');
    await prisma.donation.delete({ where: { id } });
    await createAuditEntry(userId, 'DONATIONS_DELETED', 'donations', id);
    log.info('Donations deleted', { id });
  }
}

export const donationsService = new DonationsService();