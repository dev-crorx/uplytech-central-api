import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('DonationsService');

export class DonationsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.DonationWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.DonationOrderByWithRelationInput,
        
      }),
      prisma.donation.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.donation.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Donation');
    }

    return record;
  }

  async create(data: Prisma.DonationCreateInput, userId?: string) {
    
    
    

    const record = await prisma.donation.create({ data });

    await eventBus.emit('donations.created', {
      type: 'donations.created',
      source: 'donations-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'donations', record.id);

    log.info('Donation created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.DonationUpdateInput, userId?: string) {
    const existing = await prisma.donation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Donation');
    }

    const record = await prisma.donation.update({
      where: { id },
      data,
    });

    await eventBus.emit('donations.updated', {
      type: 'donations.updated',
      source: 'donations-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'donations', id);

    log.info('Donation updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.donation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Donation');
    }

    await prisma.donation.delete({ where: { id } });

    await eventBus.emit('donations.deleted', {
      type: 'donations.deleted',
      source: 'donations-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'donations', id);

    log.info('Donation deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.DonationWhereInput = {
      id: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.donation.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const donationsService = new DonationsService();
