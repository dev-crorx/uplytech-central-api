// @ts-nocheck
import { Prisma } from '@prisma/client';
import argon2 from 'argon2';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('UsersService');

export class UsersService {
  async findAll(params: PaginationParams, filters?: { status?: string; role?: string; search?: string }) {
    const where: Prisma.UserWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.search) {
      where.OR = [
        { username: { contains: filters.search } },
        { email: { contains: filters.search } },
        { displayName: { contains: filters.search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.UserOrderByWithRelationInput,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: { include: { role: { select: { id: true, name: true } } } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        status: true,
        emailVerified: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        userRoles: { include: { role: { select: { id: true, name: true, description: true } } } },
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        status: true,
        emailVerified: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: { include: { role: { select: { name: true } } } },
        _count: {
          select: {
            sentFriendRequests: true,
            teamMemberships: true,
            groupMemberships: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundError('User');
    return user;
  }

  async updateProfile(userId: string, data: { displayName?: string; avatar?: string; bio?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        ...(data.bio !== undefined && { bio: data.bio }),
      },
      select: { id: true, displayName: true, avatar: true, bio: true },
    });

    await eventBus.emit('users.profile_updated', {
      type: 'users.profile_updated',
      source: 'users-service',
      data: { userId },
      userId,
    });
    await createAuditEntry(userId, 'PROFILE_UPDATED', 'user', userId);
    log.info('Profile updated', { userId });
    return user;
  }

  async banUser(targetId: string, adminId: string, reason: string) {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundError('User');
    if (user.status === 'BANNED') throw new BadRequestError('User is already banned');

    await prisma.user.update({
      where: { id: targetId },
      data: { status: 'BANNED' },
    });

    await prisma.session.deleteMany({ where: { userId: targetId } });

    await eventBus.emit('users.banned', {
      type: 'users.banned',
      source: 'users-service',
      data: { targetId, reason },
      userId: adminId,
    });
    await createAuditEntry(adminId, 'USER_BANNED', 'user', targetId, { reason } as object);
    log.warn('User banned', { targetId, adminId, reason });
  }

  async unbanUser(targetId: string, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundError('User');
    if (user.status !== 'BANNED') throw new BadRequestError('User is not banned');

    await prisma.user.update({
      where: { id: targetId },
      data: { status: 'ACTIVE' },
    });

    await eventBus.emit('users.unbanned', {
      type: 'users.unbanned',
      source: 'users-service',
      data: { targetId },
      userId: adminId,
    });
    await createAuditEntry(adminId, 'USER_UNBANNED', 'user', targetId);
    log.info('User unbanned', { targetId, adminId });
  }

  async suspendUser(targetId: string, adminId: string, until: Date, reason: string) {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundError('User');

    await prisma.user.update({
      where: { id: targetId },
      data: { status: 'SUSPENDED' },
    });

    await eventBus.emit('users.suspended', {
      type: 'users.suspended',
      source: 'users-service',
      data: { targetId, until: until.toISOString(), reason },
      userId: adminId,
    });
    await createAuditEntry(adminId, 'USER_SUSPENDED', 'user', targetId, { until: until.toISOString(), reason } as object);
    log.warn('User suspended', { targetId, adminId, until, reason });
  }

  async verifyEmail(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
    await createAuditEntry(userId, 'EMAIL_VERIFIED', 'user', userId);
    log.info('Email verified', { userId });
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: { id: true, avatar: true },
    });
    await createAuditEntry(userId, 'AVATAR_UPDATED', 'user', userId);
    return user;
  }

  async setStatus(userId: string, status: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { status },
    });
    await eventBus.emit('users.status_changed', {
      type: 'users.status_changed',
      source: 'users-service',
      data: { userId, status },
      userId,
    });
  }

  async resetPassword(userId: string, newPassword: string, adminId: string) {
    const hash = await argon2.hash(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });
    await prisma.session.deleteMany({ where: { userId } });
    await createAuditEntry(adminId, 'PASSWORD_RESET_ADMIN', 'user', userId);
    log.info('Password reset by admin', { userId, adminId });
  }

  async getStats() {
    const [total, active, banned, suspended, verified] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'BANNED' } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count({ where: { emailVerified: true } }),
    ]);
    return { total, active, banned, suspended, verified };
  }

  async getOnlineUsers() {
    const recentThreshold = new Date(Date.now() - 15 * 60 * 1000);
    return prisma.user.findMany({
      where: { lastLoginAt: { gte: recentThreshold }, status: 'ACTIVE' },
      select: { id: true, username: true, displayName: true, avatar: true, lastLoginAt: true },
      orderBy: { lastLoginAt: 'desc' },
    });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.UserWhereInput = {
      OR: [
        { username: { contains: query } },
        { email: { contains: query } },
        { displayName: { contains: query } },
      ],
      status: { not: 'BANNED' },
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, username: true, displayName: true, avatar: true, status: true },
      }),
      prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async deleteAccount(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    await prisma.session.deleteMany({ where: { userId } });
    await prisma.apiKey.deleteMany({ where: { userId } });
    await prisma.oAuthAccount.deleteMany({ where: { userId } });

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@deleted.local`,
        username: `deleted_${userId}`,
        displayName: 'Deleted User',
        avatar: null,
        bio: null,
        status: 'DELETED',
        passwordHash: null,
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    await eventBus.emit('users.deleted', {
      type: 'users.deleted',
      source: 'users-service',
      data: { userId },
      userId,
    });
    await createAuditEntry(userId, 'ACCOUNT_DELETED', 'user', userId);
    log.info('Account deleted (anonymized)', { userId });
  }
}

export const usersService = new UsersService();
