// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('FeaturesService');

export class FeaturesService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.feature.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.feature.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.feature.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Features');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.feature.create({ data: data as Prisma.FeatureCreateInput });
    await eventBus.emit('features.created', { type: 'features.created', source: 'features-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'FEATURES_CREATED', 'features', item.id);
    log.info('Features created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.feature.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Features');
    const updated = await prisma.feature.update({ where: { id }, data: data as Prisma.FeatureUpdateInput });
    await createAuditEntry(userId, 'FEATURES_UPDATED', 'features', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.feature.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Features');
    await prisma.feature.delete({ where: { id } });
    await createAuditEntry(userId, 'FEATURES_DELETED', 'features', id);
    log.info('Features deleted', { id });
  }
}

export const featuresService = new FeaturesService();