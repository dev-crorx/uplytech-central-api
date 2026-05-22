import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse, slugify } from '../../../core/utils';

const log = new ModuleLogger('FeaturesService');

export class FeaturesService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.FeatureWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.feature.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.FeatureOrderByWithRelationInput,
        
      }),
      prisma.feature.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.feature.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Feature');
    }

    return record;
  }

  async create(data: Prisma.FeatureCreateInput, userId?: string) {
    const nameOrTitle = (data as Record<string, unknown>).name || (data as Record<string, unknown>).title || '';
    const slug = slugify(String(nameOrTitle));
    (data as Record<string, unknown>).slug = slug;
    
    

    const record = await prisma.feature.create({ data });

    await eventBus.emit('features.created', {
      type: 'features.created',
      source: 'features-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'features', record.id);

    log.info('Feature created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.FeatureUpdateInput, userId?: string) {
    const existing = await prisma.feature.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Feature');
    }

    const record = await prisma.feature.update({
      where: { id },
      data,
    });

    await eventBus.emit('features.updated', {
      type: 'features.updated',
      source: 'features-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'features', id);

    log.info('Feature updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.feature.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Feature');
    }

    await prisma.feature.delete({ where: { id } });

    await eventBus.emit('features.deleted', {
      type: 'features.deleted',
      source: 'features-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'features', id);

    log.info('Feature deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.FeatureWhereInput = {
      name: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.feature.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.feature.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const featuresService = new FeaturesService();
