// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('TournamentsService');

export class TournamentsService {
  async findAll(params: PaginationParams, filters?: { status?: string; gameId?: string }) {
    const where: Prisma.TournamentWhereInput = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.gameId) where.gameId = filters.gameId;
    const [data, total] = await Promise.all([
      prisma.tournament.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { startDate: 'desc' },
        include: { game: { select: { id: true, name: true } }, _count: { select: { participants: true, matches: true } } } }),
      prisma.tournament.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const t = await prisma.tournament.findUnique({ where: { id },
      include: { game: true, participants: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } },
        matches: { orderBy: { round: 'asc' } } } });
    if (!t) throw new NotFoundError('Tournament');
    return t;
  }

  async create(data: { name: string; description?: string; gameId: string; maxParticipants: number; startDate: string; endDate?: string; prizePool?: string; format?: string }, userId: string) {
    const tournament = await prisma.tournament.create({
      data: { name: data.name, description: data.description || null, gameId: data.gameId, maxParticipants: data.maxParticipants,
        startDate: new Date(data.startDate), endDate: data.endDate ? new Date(data.endDate) : null,
        prizePool: data.prizePool || null, format: data.format || 'SINGLE_ELIMINATION',
        status: 'REGISTRATION', organizerId: userId },
    });
    await eventBus.emit('tournaments.created', { type: 'tournaments.created', source: 'tournaments-service', data: { id: tournament.id }, userId });
    await createAuditEntry(userId, 'TOURNAMENT_CREATED', 'tournament', tournament.id);
    log.info('Tournament created', { id: tournament.id, name: tournament.name });
    return tournament;
  }

  async register(tournamentId: string, userId: string) {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId }, include: { _count: { select: { participants: true } } } });
    if (!t) throw new NotFoundError('Tournament');
    if (t.status !== 'REGISTRATION') throw new BadRequestError('Registration is not open');
    if (t._count.participants >= t.maxParticipants) throw new BadRequestError('Tournament is full');
    const existing = await prisma.tournamentParticipant.findUnique({ where: { tournamentId_userId: { tournamentId, userId } } });
    if (existing) throw new BadRequestError('Already registered');
    const participant = await prisma.tournamentParticipant.create({
      data: { tournamentId, userId, seed: t._count.participants + 1 },
    });
    await eventBus.emit('tournaments.registered', { type: 'tournaments.registered', source: 'tournaments-service', data: { tournamentId, userId }, userId });
    return participant;
  }

  async unregister(tournamentId: string, userId: string) {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new NotFoundError('Tournament');
    if (t.status !== 'REGISTRATION') throw new BadRequestError('Cannot unregister after registration closes');
    await prisma.tournamentParticipant.deleteMany({ where: { tournamentId, userId } });
  }

  async startTournament(tournamentId: string, userId: string) {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId }, include: { participants: true } });
    if (!t) throw new NotFoundError('Tournament');
    if (t.organizerId !== userId) throw new BadRequestError('Only organizer can start');
    if (t.status !== 'REGISTRATION') throw new BadRequestError('Tournament is not in registration phase');
    if (t.participants.length < 2) throw new BadRequestError('Need at least 2 participants');
    const shuffled = [...t.participants].sort(() => Math.random() - 0.5);
    const matches: Array<{ tournamentId: string; round: number; matchNumber: number; player1Id: string; player2Id: string | null; status: string }> = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      matches.push({ tournamentId, round: 1, matchNumber: Math.floor(i / 2) + 1, player1Id: shuffled[i].userId, player2Id: shuffled[i + 1]?.userId || null, status: shuffled[i + 1] ? 'PENDING' : 'BYE' });
    }
    await prisma.tournamentMatch.createMany({ data: matches });
    await prisma.tournament.update({ where: { id: tournamentId }, data: { status: 'IN_PROGRESS' } });
    await eventBus.emit('tournaments.started', { type: 'tournaments.started', source: 'tournaments-service', data: { tournamentId }, userId });
    await createAuditEntry(userId, 'TOURNAMENT_STARTED', 'tournament', tournamentId);
    log.info('Tournament started', { tournamentId });
  }

  async reportMatchResult(matchId: string, winnerId: string, score: string, userId: string) {
    const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundError('Match');
    await prisma.tournamentMatch.update({ where: { id: matchId }, data: { winnerId, score, status: 'COMPLETED' } });
    await createAuditEntry(userId, 'MATCH_RESULT_REPORTED', 'tournament_match', matchId, { winnerId, score } as object);
    return { matchId, winnerId, score };
  }

  async endTournament(tournamentId: string, userId: string) {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new NotFoundError('Tournament');
    if (t.organizerId !== userId) throw new BadRequestError('Only organizer can end');
    await prisma.tournament.update({ where: { id: tournamentId }, data: { status: 'COMPLETED' } });
    await eventBus.emit('tournaments.ended', { type: 'tournaments.ended', source: 'tournaments-service', data: { tournamentId }, userId });
    await createAuditEntry(userId, 'TOURNAMENT_ENDED', 'tournament', tournamentId);
  }

  async getBracket(tournamentId: string) {
    return prisma.tournamentMatch.findMany({ where: { tournamentId }, orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
      include: { player1: { select: { id: true, username: true, displayName: true } }, player2: { select: { id: true, username: true, displayName: true } }, winner: { select: { id: true, username: true, displayName: true } } } });
  }
}

export const tournamentsService = new TournamentsService();