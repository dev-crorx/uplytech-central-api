import { Request, Response, NextFunction } from 'express';
import { auditService } from '../service/audit.service';
import { parsePagination } from '../../../core/utils';

export class AuditController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await auditService.findAll(p) }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await auditService.findById(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await auditService.create(req.body, uid) }); } catch (e) { next(e); }
  }
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await auditService.update(String(req.params.id), req.body, uid) }); } catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await auditService.delete(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
}
export const auditController = new AuditController();