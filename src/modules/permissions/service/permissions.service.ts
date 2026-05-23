import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('PermissionsService');

export class PermissionsService {
  async findAll(params: PaginationParams, filters?: { resource?: string; action?: string }) {
    const where: Prisma.PermissionWhereInput = {};
    if (filters?.resource) where.resource = filters.resource;
    if (filters?.action) where.action = filters.action;

    const [data, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { resource: 'asc' },
      }),
      prisma.permission.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const perm = await prisma.permission.findUnique({
      where: { id },
      include: { rolePermissions: { include: { role: { select: { id: true, name: true } } } } },
    });
    if (!perm) throw new NotFoundError('Permission');
    return perm;
  }

  async create(data: { description?: string; resource: string; action: string }, userId: string) {
    const perm = await prisma.permission.create({ data: {
      description: data.description || null,
      resource: data.resource,
      action: data.action,
    }});
    await createAuditEntry(userId, 'PERMISSION_CREATED', 'permission', perm.id);
    log.info('Permission created', { id: perm.id, resource: perm.resource, action: perm.action });
    return perm;
  }

  async update(id: string, data: { description?: string }, userId: string) {
    const perm = await prisma.permission.findUnique({ where: { id } });
    if (!perm) throw new NotFoundError('Permission');
    const updated = await prisma.permission.update({ where: { id }, data: { description: data.description } });
    await createAuditEntry(userId, 'PERMISSION_UPDATED', 'permission', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const perm = await prisma.permission.findUnique({ where: { id } });
    if (!perm) throw new NotFoundError('Permission');
    await prisma.rolePermission.deleteMany({ where: { permissionId: id } });
    await prisma.permission.delete({ where: { id } });
    await createAuditEntry(userId, 'PERMISSION_DELETED', 'permission', id);
    log.info('Permission deleted', { id });
  }

  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
    });
    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        if ((rp.permission.resource === resource || rp.permission.resource === '*') &&
            (rp.permission.action === action || rp.permission.action === '*')) {
          return true;
        }
      }
    }
    return false;
  }

  async getResourcePermissions(resource: string) {
    return prisma.permission.findMany({ where: { resource }, orderBy: { action: 'asc' } });
  }

  async bulkAssign(roleId: string, permissionIds: string[], userId: string) {
    const existing = await prisma.rolePermission.findMany({ where: { roleId } });
    const existingIds = existing.map(e => e.permissionId);
    const newIds = permissionIds.filter(id => !existingIds.includes(id));

    if (newIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: newIds.map(permissionId => ({ roleId, permissionId })),
      });
    }
    await createAuditEntry(userId, 'PERMISSIONS_BULK_ASSIGNED', 'permission', roleId, { count: newIds.length } as object);
    return { assigned: newIds.length, skipped: permissionIds.length - newIds.length };
  }
}

export const permissionsService = new PermissionsService();