// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('GroupsService');

export class GroupsService {
  async findAll(params: PaginationParams, filters?: { isPublic?: boolean }) {
    const where: Prisma.GroupWhereInput = {};
    if (filters?.isPublic !== undefined) where.isPublic = filters.isPublic;
    const [data, total] = await Promise.all([
      prisma.group.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' },
        include: { owner: { select: { id: true, username: true, displayName: true } }, _count: { select: { members: true } } } }),
      prisma.group.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const group = await prisma.group.findUnique({ where: { id },
      include: { owner: { select: { id: true, username: true, displayName: true, avatar: true } },
        members: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } } } });
    if (!group) throw new NotFoundError('Group');
    return group;
  }

  async create(data: { name: string; description?: string; isPublic?: boolean }, userId: string) {
    const group = await prisma.group.create({
      data: { name: data.name, description: data.description || null, isPublic: data.isPublic !== false, ownerId: userId },
    });
    await prisma.groupMember.create({ data: { groupId: group.id, userId, role: 'OWNER' } });
    await eventBus.emit('groups.created', { type: 'groups.created', source: 'groups-service', data: { id: group.id }, userId });
    await createAuditEntry(userId, 'GROUP_CREATED', 'group', group.id);
    log.info('Group created', { id: group.id });
    return group;
  }

  async update(id: string, data: { name?: string; description?: string; isPublic?: boolean }, userId: string) {
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundError('Group');
    if (group.ownerId !== userId) throw new BadRequestError('Only group owner can update');
    return prisma.group.update({ where: { id }, data });
  }

  async delete(id: string, userId: string) {
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundError('Group');
    if (group.ownerId !== userId) throw new BadRequestError('Only group owner can delete');
    await prisma.groupMember.deleteMany({ where: { groupId: id } });
    await prisma.group.delete({ where: { id } });
    await createAuditEntry(userId, 'GROUP_DELETED', 'group', id);
  }

  async join(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundError('Group');
    if (!group.isPublic) throw new BadRequestError('Group is private, request an invite');
    const existing = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
    if (existing) throw new BadRequestError('Already a member');
    await prisma.groupMember.create({ data: { groupId, userId, role: 'MEMBER' } });
    await eventBus.emit('groups.member_joined', { type: 'groups.member_joined', source: 'groups-service', data: { groupId, userId }, userId });
  }

  async leave(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundError('Group');
    if (group.ownerId === userId) throw new BadRequestError('Owner cannot leave, transfer ownership first');
    await prisma.groupMember.deleteMany({ where: { groupId, userId } });
    await eventBus.emit('groups.member_left', { type: 'groups.member_left', source: 'groups-service', data: { groupId, userId }, userId });
  }

  async kickMember(groupId: string, targetUserId: string, adminId: string) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundError('Group');
    if (group.ownerId === targetUserId) throw new BadRequestError('Cannot kick the owner');
    await prisma.groupMember.deleteMany({ where: { groupId, userId: targetUserId } });
    await createAuditEntry(adminId, 'GROUP_MEMBER_KICKED', 'group', groupId, { targetUserId } as object);
  }

  async updateMemberRole(groupId: string, targetUserId: string, role: string, adminId: string) {
    const member = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: targetUserId } } });
    if (!member) throw new NotFoundError('Group member');
    await prisma.groupMember.update({ where: { groupId_userId: { groupId, userId: targetUserId } }, data: { role } });
    await createAuditEntry(adminId, 'GROUP_MEMBER_ROLE_CHANGED', 'group', groupId, { targetUserId, role } as object);
  }

  async getMyGroups(userId: string) {
    return prisma.groupMember.findMany({
      where: { userId },
      include: { group: { include: { _count: { select: { members: true } } } } },
    });
  }
}

export const groupsService = new GroupsService();