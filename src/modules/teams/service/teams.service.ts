// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('TeamsService');

export class TeamsService {
  async findAll(params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.team.findMany({
        skip: (params.page - 1) * params.limit, take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { members: true } }, owner: { select: { id: true, username: true, displayName: true, avatar: true } } },
      }),
      prisma.team.count(),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, displayName: true, avatar: true } },
        members: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } },
      },
    });
    if (!team) throw new NotFoundError('Team');
    return team;
  }

  async create(data: { name: string; description?: string; avatar?: string }, userId: string) {
    const team = await prisma.team.create({
      data: { name: data.name, description: data.description || null, avatar: data.avatar || null, ownerId: userId },
    });
    await prisma.teamMember.create({ data: { teamId: team.id, userId, role: 'OWNER' } });
    await eventBus.emit('teams.created', { type: 'teams.created', source: 'teams-service', data: { id: team.id }, userId });
    await createAuditEntry(userId, 'TEAM_CREATED', 'team', team.id);
    log.info('Team created', { id: team.id, name: team.name });
    return team;
  }

  async update(id: string, data: { name?: string; description?: string; avatar?: string }, userId: string) {
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundError('Team');
    if (team.ownerId !== userId) throw new BadRequestError('Only the team owner can update the team');
    const updated = await prisma.team.update({ where: { id }, data });
    await createAuditEntry(userId, 'TEAM_UPDATED', 'team', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundError('Team');
    if (team.ownerId !== userId) throw new BadRequestError('Only the team owner can delete the team');
    await prisma.teamMember.deleteMany({ where: { teamId: id } });
    await prisma.team.delete({ where: { id } });
    await eventBus.emit('teams.deleted', { type: 'teams.deleted', source: 'teams-service', data: { id }, userId });
    await createAuditEntry(userId, 'TEAM_DELETED', 'team', id);
    log.info('Team deleted', { id });
  }

  async addMember(teamId: string, targetUserId: string, role: string, userId: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundError('Team');
    const existing = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: targetUserId } } });
    if (existing) throw new BadRequestError('User is already a team member');
    await prisma.teamMember.create({ data: { teamId, userId: targetUserId, role: role || 'MEMBER' } });
    await eventBus.emit('teams.member_added', { type: 'teams.member_added', source: 'teams-service', data: { teamId, targetUserId }, userId });
    await createAuditEntry(userId, 'TEAM_MEMBER_ADDED', 'team', teamId, { targetUserId } as object);
    log.info('Team member added', { teamId, targetUserId });
  }

  async removeMember(teamId: string, targetUserId: string, userId: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundError('Team');
    if (team.ownerId === targetUserId) throw new BadRequestError('Cannot remove the team owner');
    await prisma.teamMember.deleteMany({ where: { teamId, userId: targetUserId } });
    await eventBus.emit('teams.member_removed', { type: 'teams.member_removed', source: 'teams-service', data: { teamId, targetUserId }, userId });
    await createAuditEntry(userId, 'TEAM_MEMBER_REMOVED', 'team', teamId, { targetUserId } as object);
  }

  async updateMemberRole(teamId: string, targetUserId: string, role: string, userId: string) {
    const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: targetUserId } } });
    if (!member) throw new NotFoundError('Team member');
    await prisma.teamMember.update({ where: { teamId_userId: { teamId, userId: targetUserId } }, data: { role } });
    await createAuditEntry(userId, 'TEAM_MEMBER_ROLE_CHANGED', 'team', teamId, { targetUserId, role } as object);
  }

  async transferOwnership(teamId: string, newOwnerId: string, userId: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundError('Team');
    if (team.ownerId !== userId) throw new BadRequestError('Only the owner can transfer ownership');
    const isMember = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: newOwnerId } } });
    if (!isMember) throw new BadRequestError('New owner must be a team member');
    await prisma.$transaction([
      prisma.team.update({ where: { id: teamId }, data: { ownerId: newOwnerId } }),
      prisma.teamMember.update({ where: { teamId_userId: { teamId, userId: newOwnerId } }, data: { role: 'OWNER' } }),
      prisma.teamMember.update({ where: { teamId_userId: { teamId, userId } }, data: { role: 'ADMIN' } }),
    ]);
    await createAuditEntry(userId, 'TEAM_OWNERSHIP_TRANSFERRED', 'team', teamId, { newOwnerId } as object);
    log.info('Team ownership transferred', { teamId, from: userId, to: newOwnerId });
  }

  async getMyTeams(userId: string) {
    return prisma.teamMember.findMany({
      where: { userId },
      include: { team: { include: { _count: { select: { members: true } } } } },
    });
  }
}

export const teamsService = new TeamsService();