import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('LicensesService');

export class LicensesService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.LicenseWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.license.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.LicenseOrderByWithRelationInput,
        
      }),
      prisma.license.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.license.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('License');
    }

    return record;
  }

  async create(data: Prisma.LicenseCreateInput, userId?: string) {
    
    
    

    const record = await prisma.license.create({ data });

    await eventBus.emit('licenses.created', {
      type: 'licenses.created',
      source: 'licenses-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'licenses', record.id);

    log.info('License created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.LicenseUpdateInput, userId?: string) {
    const existing = await prisma.license.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('License');
    }

    const record = await prisma.license.update({
      where: { id },
      data,
    });

    await eventBus.emit('licenses.updated', {
      type: 'licenses.updated',
      source: 'licenses-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'licenses', id);

    log.info('License updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.license.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('License');
    }

    await prisma.license.delete({ where: { id } });

    await eventBus.emit('licenses.deleted', {
      type: 'licenses.deleted',
      source: 'licenses-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'licenses', id);

    log.info('License deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.LicenseWhereInput = {
      key: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.license.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.license.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const licensesService = new LicensesService();
