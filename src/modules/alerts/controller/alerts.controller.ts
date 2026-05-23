import { Request, Response, NextFunction } from 'express';
import { alertsService } from '../service/alerts.service';
import { parsePagination } from '../../../core/utils';

export class AlertsController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const f = { severity: req.query.severity ? String(req.query.severity) : undefined, status: req.query.status ? String(req.query.status) : undefined, type: req.query.type ? String(req.query.type) : undefined }; res.json({ success: true, ...await alertsService.findAll(p, f) }); } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ success: true, data: await alertsService.create(req.body) }); } catch (e) { next(e); }
  }
  async acknowledge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await alertsService.acknowledge(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async resolve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await alertsService.resolve(String(req.params.id), uid, String(req.body.resolution || '')); res.json({ success: true }); } catch (e) { next(e); }
  }
  async dismiss(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await alertsService.dismiss(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async getActiveCount(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await alertsService.getActiveCount() }); } catch (e) { next(e); }
  }
}
export const alertsController = new AlertsController();