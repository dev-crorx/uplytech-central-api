// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError, ConflictError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('RolesService');

export class RolesService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.role.findMany({
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.RoleOrderByWithRelationInput,
        include: {
          permissions: { include: { permission: { select: { id: true, name: true, resource: true, action: true } } } },
          _count: { select: { users: true } },
        },
      }),
      prisma.role.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        users: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } },
      },
    });
    if (!role) throw new NotFoundError('Role');
    return role;
  }

  async create(data: { name: string; description?: string; isDefault?: boolean }, userId: string) {
    const existing = await prisma.role.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictError('Role with this name already exists');

    const role = await prisma.role.create({
      data: { name: data.name, description: data.description || null, isDefault: data.isDefault || false },
    });

    await eventBus.emit('roles.created', { type: 'roles.created', source: 'roles-service', data: { id: role.id, name: role.name }, userId });
    await createAuditEntry(userId, 'ROLE_CREATED', 'role', role.id);
    log.info('Role created', { id: role.id, name: role.name });
    return role;
  }

  async update(id: string, data: { name?: string; description?: string; isDefault?: boolean }, userId: string) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundError('Role');
    if (role.isSystem) throw new BadRequestError('System roles cannot be modified');

    if (data.name && data.name !== role.name) {
      const dup = await prisma.role.findUnique({ where: { name: data.name } });
      if (dup) throw new ConflictError('Role name already taken');
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      },
    });

    await createAuditEntry(userId, 'ROLE_UPDATED', 'role', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundError('Role');
    if (role.isSystem) throw new BadRequestError('System roles cannot be deleted');

    const usersWithRole = await prisma.userRole.count({ where: { roleId: id } });
    if (usersWithRole > 0) throw new BadRequestError('Cannot delete role with assigned users. Remove users first.');

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });

    await eventBus.emit('roles.deleted', { type: 'roles.deleted', source: 'roles-service', data: { id, name: role.name }, userId });
    await createAuditEntry(userId, 'ROLE_DELETED', 'role', id);
    log.info('Role deleted', { id, name: role.name });
  }

  async assignToUser(roleId: string, targetUserId: string, adminId: string) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError('Role');

    const existing = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: targetUserId, roleId } },
    });
    if (existing) throw new BadRequestError('User already has this role');

    await prisma.userRole.create({ data: { userId: targetUserId, roleId } });
    await eventBus.emit('roles.assigned', { type: 'roles.assigned', source: 'roles-service', data: { roleId, userId: targetUserId }, userId: adminId });
    await createAuditEntry(adminId, 'ROLE_ASSIGNED', 'role', roleId, { targetUserId } as object);
    log.info('Role assigned', { roleId, targetUserId });
  }

  async removeFromUser(roleId: string, targetUserId: string, adminId: string) {
    const assignment = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: targetUserId, roleId } },
    });
    if (!assignment) throw new NotFoundError('Role assignment');

    await prisma.userRole.delete({ where: { userId_roleId: { userId: targetUserId, roleId } } });
    await eventBus.emit('roles.removed', { type: 'roles.removed', source: 'roles-service', data: { roleId, userId: targetUserId }, userId: adminId });
    await createAuditEntry(adminId, 'ROLE_REMOVED', 'role', roleId, { targetUserId } as object);
    log.info('Role removed from user', { roleId, targetUserId });
  }

  async addPermission(roleId: string, permissionId: string, adminId: string) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError('Role');

    const existing = await prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
    if (existing) throw new BadRequestError('Role already has this permission');

    await prisma.rolePermission.create({ data: { roleId, permissionId } });
    await createAuditEntry(adminId, 'PERMISSION_ADDED_TO_ROLE', 'role', roleId, { permissionId } as object);
  }

  async removePermission(roleId: string, permissionId: string, adminId: string) {
    await prisma.rolePermission.deleteMany({ where: { roleId, permissionId } });
    await createAuditEntry(adminId, 'PERMISSION_REMOVED_FROM_ROLE', 'role', roleId, { permissionId } as object);
  }

  async getUserRoles(userId: string) {
    return prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
  }
}

export const rolesService = new RolesService();
