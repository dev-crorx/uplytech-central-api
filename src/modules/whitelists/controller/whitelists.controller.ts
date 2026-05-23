import { Request, Response, NextFunction } from 'express';
import { whitelistsService } from '../service/whitelists.service';
import { parsePagination } from '../../../core/utils';

export class WhitelistsController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await whitelistsService.findAll(p) }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await whitelistsService.findById(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await whitelistsService.create(req.body, uid) }); } catch (e) { next(e); }
  }
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await whitelistsService.update(String(req.params.id), req.body, uid) }); } catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await whitelistsService.delete(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
}
export const whitelistsController = new WhitelistsController();