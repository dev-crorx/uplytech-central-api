import { Request, Response, NextFunction } from 'express';
import { areasService } from '../service/areas.service';
import { parsePagination } from '../../../core/utils';

export class AreasController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await areasService.findAll(p) }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await areasService.findById(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await areasService.create(req.body, uid) }); } catch (e) { next(e); }
  }
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await areasService.update(String(req.params.id), req.body, uid) }); } catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await areasService.delete(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
}
export const areasController = new AreasController();