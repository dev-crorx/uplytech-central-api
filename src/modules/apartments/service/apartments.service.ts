import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ApartmentsService');

export class ApartmentsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.ApartmentWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.apartment.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.ApartmentOrderByWithRelationInput,
        
      }),
      prisma.apartment.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.apartment.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Apartment');
    }

    return record;
  }

  async create(data: Prisma.ApartmentCreateInput, userId?: string) {
    
    
    

    const record = await prisma.apartment.create({ data });

    await eventBus.emit('apartments.created', {
      type: 'apartments.created',
      source: 'apartments-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'apartments', record.id);

    log.info('Apartment created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.ApartmentUpdateInput, userId?: string) {
    const existing = await prisma.apartment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Apartment');
    }

    const record = await prisma.apartment.update({
      where: { id },
      data,
    });

    await eventBus.emit('apartments.updated', {
      type: 'apartments.updated',
      source: 'apartments-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'apartments', id);

    log.info('Apartment updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.apartment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Apartment');
    }

    await prisma.apartment.delete({ where: { id } });

    await eventBus.emit('apartments.deleted', {
      type: 'apartments.deleted',
      source: 'apartments-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'apartments', id);

    log.info('Apartment deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.ApartmentWhereInput = {
      name: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.apartment.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.apartment.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const apartmentsService = new ApartmentsService();
