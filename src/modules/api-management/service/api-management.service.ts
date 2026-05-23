// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ApiManagementService');

export class ApiManagementService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.apiEndpoint.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.apiEndpoint.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.apiEndpoint.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('ApiManagement');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.apiEndpoint.create({ data: data as Prisma.ApiEndpointCreateInput });
    await eventBus.emit('api-management.created', { type: 'api-management.created', source: 'api-management-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'API_MANAGEMENT_CREATED', 'api-management', item.id);
    log.info('ApiManagement created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.apiEndpoint.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('ApiManagement');
    const updated = await prisma.apiEndpoint.update({ where: { id }, data: data as Prisma.ApiEndpointUpdateInput });
    await createAuditEntry(userId, 'API_MANAGEMENT_UPDATED', 'api-management', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.apiEndpoint.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('ApiManagement');
    await prisma.apiEndpoint.delete({ where: { id } });
    await createAuditEntry(userId, 'API_MANAGEMENT_DELETED', 'api-management', id);
    log.info('ApiManagement deleted', { id });
  }
}

export const apiManagementService = new ApiManagementService();