import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('AuditService');

export class AuditService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({ skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { timestamp: 'desc' } }),
      prisma.auditLog.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const item = await prisma.auditLog.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Audit');
    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const item = await prisma.auditLog.create({ data: data as Prisma.AuditLogCreateInput });
    await eventBus.emit('audit.created', { type: 'audit.created', source: 'audit-service', data: { id: item.id }, userId });
    await createAuditEntry(userId, 'AUDIT_CREATED', 'audit', item.id);
    log.info('Audit created', { id: item.id });
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const item = await prisma.auditLog.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Audit');
    const updated = await prisma.auditLog.update({ where: { id }, data: data as Prisma.AuditLogUpdateInput });
    await createAuditEntry(userId, 'AUDIT_UPDATED', 'audit', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const item = await prisma.auditLog.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Audit');
    await prisma.auditLog.delete({ where: { id } });
    await createAuditEntry(userId, 'AUDIT_DELETED', 'audit', id);
    log.info('Audit deleted', { id });
  }
}

export const auditService = new AuditService();