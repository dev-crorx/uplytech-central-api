import { Request, Response, NextFunction } from 'express';
import { logsService } from '../service/logs.service';
import { parsePagination } from '../../../core/utils';

export class LogsController {
  async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const f = { level: req.query.level ? String(req.query.level) : undefined, source: req.query.source ? String(req.query.source) : undefined, search: req.query.search ? String(req.query.search) : undefined, startDate: req.query.startDate ? new Date(String(req.query.startDate)) : undefined, endDate: req.query.endDate ? new Date(String(req.query.endDate)) : undefined }; res.json({ success: true, ...await logsService.getLogs(p, f) }); } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ success: true, data: await logsService.create(req.body) }); } catch (e) { next(e); }
  }
  async getLevels(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await logsService.getLevels() }); } catch (e) { next(e); }
  }
  async getSources(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await logsService.getSources() }); } catch (e) { next(e); }
  }
  async purge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await logsService.purge(new Date(String(req.body.olderThan)), uid) }); } catch (e) { next(e); }
  }
  async getErrorRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await logsService.getErrorRate(Number(req.query.hours || 24)) }); } catch (e) { next(e); }
  }
}
export const logsController = new LogsController();