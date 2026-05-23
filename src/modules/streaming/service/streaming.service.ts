// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('StreamingService');

export class StreamingService {
  async getStreams(params: PaginationParams, filters?: { status?: string; platform?: string }) {
    const where: Prisma.StreamWhereInput = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.platform) where.platforms = { contains: filters.platform };
    const [data, total] = await Promise.all([
      prisma.stream.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } }),
      prisma.stream.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const stream = await prisma.stream.findUnique({ where: { id },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } });
    if (!stream) throw new NotFoundError('Stream');
    return stream;
  }

  async createStream(data: { title: string; description?: string; platforms: string[]; streamKey?: string; obsConfig?: object }, userId: string) {
    const stream = await prisma.stream.create({
      data: { title: data.title, description: data.description || null, platforms: data.platforms.join(','),
        streamKey: data.streamKey || 'sk_' + Date.now() + '_' + Math.random().toString(36).substring(7),
        obsConfig: data.obsConfig || null, userId, status: 'OFFLINE' },
    });
    await eventBus.emit('streaming.created', { type: 'streaming.created', source: 'streaming-service', data: { id: stream.id }, userId });
    await createAuditEntry(userId, 'STREAM_CREATED', 'streaming', stream.id);
    log.info('Stream created', { id: stream.id });
    return stream;
  }

  async goLive(id: string, userId: string) {
    const stream = await prisma.stream.findUnique({ where: { id } });
    if (!stream) throw new NotFoundError('Stream');
    if (stream.userId !== userId) throw new BadRequestError('Not your stream');
    await prisma.stream.update({ where: { id }, data: { status: 'LIVE', startedAt: new Date() } });
    const platforms = stream.platforms.split(',');
    for (const platform of platforms) {
      await eventBus.emit('streaming.platform_connected', { type: 'streaming.platform_connected', source: 'streaming-service', data: { streamId: id, platform }, userId });
    }
    await eventBus.emit('streaming.live', { type: 'streaming.live', source: 'streaming-service', data: { id, platforms }, userId });
    log.info('Stream went live', { id, platforms });
  }

  async goOffline(id: string, userId: string) {
    const stream = await prisma.stream.findUnique({ where: { id } });
    if (!stream) throw new NotFoundError('Stream');
    const duration = stream.startedAt ? Math.floor((Date.now() - stream.startedAt.getTime()) / 1000) : 0;
    await prisma.stream.update({ where: { id }, data: { status: 'OFFLINE', endedAt: new Date(), duration } });
    await eventBus.emit('streaming.offline', { type: 'streaming.offline', source: 'streaming-service', data: { id, duration }, userId });
    log.info('Stream went offline', { id, duration });
  }

  async updateStreamInfo(id: string, data: { title?: string; description?: string }, userId: string) {
    const stream = await prisma.stream.findUnique({ where: { id } });
    if (!stream || stream.userId !== userId) throw new NotFoundError('Stream');
    return prisma.stream.update({ where: { id }, data });
  }

  async addPlatform(id: string, platform: string, userId: string) {
    const stream = await prisma.stream.findUnique({ where: { id } });
    if (!stream || stream.userId !== userId) throw new NotFoundError('Stream');
    const platforms = stream.platforms ? stream.platforms.split(',') : [];
    if (!platforms.includes(platform)) {
      platforms.push(platform);
      await prisma.stream.update({ where: { id }, data: { platforms: platforms.join(',') } });
    }
    await createAuditEntry(userId, 'PLATFORM_ADDED', 'streaming', id, { platform } as object);
  }

  async removePlatform(id: string, platform: string, userId: string) {
    const stream = await prisma.stream.findUnique({ where: { id } });
    if (!stream || stream.userId !== userId) throw new NotFoundError('Stream');
    const platforms = stream.platforms.split(',').filter(p => p !== platform);
    await prisma.stream.update({ where: { id }, data: { platforms: platforms.join(',') } });
    await createAuditEntry(userId, 'PLATFORM_REMOVED', 'streaming', id, { platform } as object);
  }

  async updateOBSConfig(id: string, config: object, userId: string) {
    const stream = await prisma.stream.findUnique({ where: { id } });
    if (!stream || stream.userId !== userId) throw new NotFoundError('Stream');
    return prisma.stream.update({ where: { id }, data: { obsConfig: config as object } });
  }

  async getMyStreams(userId: string) {
    return prisma.stream.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async getPlatformAccounts(userId: string) {
    return prisma.streamingAccount.findMany({ where: { userId }, orderBy: { platform: 'asc' } });
  }

  async connectPlatformAccount(data: { platform: string; accountId: string; accessToken: string; refreshToken?: string }, userId: string) {
    const existing = await prisma.streamingAccount.findFirst({ where: { userId, platform: data.platform } });
    if (existing) {
      return prisma.streamingAccount.update({ where: { id: existing.id }, data: { accountId: data.accountId, accessToken: data.accessToken, refreshToken: data.refreshToken || null } });
    }
    return prisma.streamingAccount.create({ data: { userId, platform: data.platform, accountId: data.accountId, accessToken: data.accessToken, refreshToken: data.refreshToken || null } });
  }

  async disconnectPlatformAccount(platform: string, userId: string) {
    await prisma.streamingAccount.deleteMany({ where: { userId, platform } });
    await createAuditEntry(userId, 'PLATFORM_DISCONNECTED', 'streaming', platform);
  }
}

export const streamingService = new StreamingService();