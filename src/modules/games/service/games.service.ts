// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('GamesService');

export class GamesService {
  async findAll(params: PaginationParams, filters?: { genre?: string; status?: string }) {
    const where: Prisma.GameWhereInput = {};
    if (filters?.genre) where.genre = filters.genre;
    if (filters?.status) where.status = filters.status;
    const [data, total] = await Promise.all([
      prisma.game.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.game.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const game = await prisma.game.findUnique({ where: { id } });
    if (!game) throw new NotFoundError('Game');
    return game;
  }

  async create(data: { name: string; description?: string; genre?: string; coverImage?: string; minPlayers?: number; maxPlayers?: number; isRanked?: boolean }, userId: string) {
    const game = await prisma.game.create({
      data: { name: data.name, description: data.description || null, genre: data.genre || null, coverImage: data.coverImage || null,
        minPlayers: data.minPlayers || 1, maxPlayers: data.maxPlayers || 100, isRanked: data.isRanked || false, status: 'ACTIVE' },
    });
    await eventBus.emit('games.created', { type: 'games.created', source: 'games-service', data: { id: game.id }, userId });
    await createAuditEntry(userId, 'GAME_CREATED', 'game', game.id);
    log.info('Game created', { id: game.id, name: game.name });
    return game;
  }

  async update(id: string, data: Prisma.GameUpdateInput, userId: string) {
    const game = await prisma.game.findUnique({ where: { id } });
    if (!game) throw new NotFoundError('Game');
    const updated = await prisma.game.update({ where: { id }, data });
    await createAuditEntry(userId, 'GAME_UPDATED', 'game', id);
    return updated;
  }

  async delete(id: string, userId: string) {
    const game = await prisma.game.findUnique({ where: { id } });
    if (!game) throw new NotFoundError('Game');
    await prisma.game.delete({ where: { id } });
    await createAuditEntry(userId, 'GAME_DELETED', 'game', id);
  }

  async updatePlayerStats(gameId: string, userId: string, stats: { wins?: number; losses?: number; draws?: number; score?: number }) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundError('Game');
    if (!game.isRanked) throw new BadRequestError('Game is not ranked');
    const currentStats = ((game.playerStats as Record<string, unknown>) || {}) as Record<string, { wins: number; losses: number; draws: number; score: number; elo: number }>;
    const playerData = currentStats[userId] || { wins: 0, losses: 0, draws: 0, score: 0, elo: 1000 };
    if (stats.wins) playerData.wins += stats.wins;
    if (stats.losses) playerData.losses += stats.losses;
    if (stats.draws) playerData.draws += stats.draws;
    if (stats.score) playerData.score += stats.score;
    if (stats.wins) playerData.elo += 25;
    if (stats.losses) playerData.elo = Math.max(0, playerData.elo - 20);
    currentStats[userId] = playerData;
    await prisma.game.update({ where: { id: gameId }, data: { playerStats: currentStats as object } });
    return playerData;
  }

  async getLeaderboard(gameId: string, limit: number) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundError('Game');
    const stats = ((game.playerStats as Record<string, unknown>) || {}) as Record<string, { wins: number; losses: number; score: number; elo: number }>;
    const entries = Object.entries(stats).map(([userId, data]) => ({ userId, ...data })).sort((a, b) => b.elo - a.elo).slice(0, limit);
    const userIds = entries.map(e => e.userId);
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, displayName: true, avatar: true } });
    const userMap = new Map(users.map(u => [u.id, u]));
    return entries.map(e => ({ ...e, user: userMap.get(e.userId) || null }));
  }

  async matchmake(gameId: string, userId: string) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundError('Game');
    const stats = ((game.playerStats as Record<string, unknown>) || {}) as Record<string, { elo: number }>;
    const playerElo = stats[userId]?.elo || 1000;
    const allPlayers = Object.entries(stats).filter(([id]) => id !== userId).map(([id, data]) => ({ id, elo: data.elo, diff: Math.abs(data.elo - playerElo) }));
    allPlayers.sort((a, b) => a.diff - b.diff);
    return allPlayers.slice(0, 10);
  }
}

export const gamesService = new GamesService();