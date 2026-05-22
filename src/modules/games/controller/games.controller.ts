import { Request, Response, NextFunction } from 'express';
import { gamesService } from '../service/games.service';
import { parsePagination } from '../../../core/utils';

export class GamesController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const f = { genre: req.query.genre ? String(req.query.genre) : undefined, status: req.query.status ? String(req.query.status) : undefined }; res.json({ success: true, ...await gamesService.findAll(p, f) }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await gamesService.findById(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await gamesService.create(req.body, uid) }); } catch (e) { next(e); }
  }
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await gamesService.update(String(req.params.id), req.body, uid) }); } catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await gamesService.delete(String(req.params.id), uid); res.json({ success: true, message: 'Game deleted' }); } catch (e) { next(e); }
  }
  async updateStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await gamesService.updatePlayerStats(String(req.params.id), uid, req.body) }); } catch (e) { next(e); }
  }
  async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await gamesService.getLeaderboard(String(req.params.id), Number(req.query.limit || 50)) }); } catch (e) { next(e); }
  }
  async matchmake(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await gamesService.matchmake(String(req.params.id), uid) }); } catch (e) { next(e); }
  }
}
export const gamesController = new GamesController();