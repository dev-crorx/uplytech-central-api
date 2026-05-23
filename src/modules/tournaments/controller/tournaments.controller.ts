import { Request, Response, NextFunction } from 'express';
import { tournamentsService } from '../service/tournaments.service';
import { parsePagination } from '../../../core/utils';

export class TournamentsController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const f = { status: req.query.status ? String(req.query.status) : undefined, gameId: req.query.gameId ? String(req.query.gameId) : undefined }; res.json({ success: true, ...await tournamentsService.findAll(p, f) }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await tournamentsService.findById(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await tournamentsService.create(req.body, uid) }); } catch (e) { next(e); }
  }
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await tournamentsService.register(String(req.params.id), uid) }); } catch (e) { next(e); }
  }
  async unregister(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await tournamentsService.unregister(String(req.params.id), uid); res.json({ success: true, message: 'Unregistered' }); } catch (e) { next(e); }
  }
  async start(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await tournamentsService.startTournament(String(req.params.id), uid); res.json({ success: true, message: 'Tournament started' }); } catch (e) { next(e); }
  }
  async reportResult(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await tournamentsService.reportMatchResult(String(req.params.matchId), String(req.body.winnerId), String(req.body.score), uid) }); } catch (e) { next(e); }
  }
  async end(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await tournamentsService.endTournament(String(req.params.id), uid); res.json({ success: true, message: 'Tournament ended' }); } catch (e) { next(e); }
  }
  async getBracket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await tournamentsService.getBracket(String(req.params.id)) }); } catch (e) { next(e); }
  }
}
export const tournamentsController = new TournamentsController();