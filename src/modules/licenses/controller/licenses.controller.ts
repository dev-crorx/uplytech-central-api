import { Request, Response, NextFunction } from 'express';
import { licensesService } from '../service/licenses.service';
import { parsePagination } from '../../../core/utils';

export class LicensesController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const f = { status: req.query.status ? String(req.query.status) : undefined, productId: req.query.productId ? String(req.query.productId) : undefined }; res.json({ success: true, ...await licensesService.findAll(p, f) }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await licensesService.findById(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await licensesService.generate(req.body, uid) }); } catch (e) { next(e); }
  }
  async validate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await licensesService.validate(String(req.body.key)) }); } catch (e) { next(e); }
  }
  async activate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await licensesService.activate(String(req.body.key), String(req.body.deviceId), uid) }); } catch (e) { next(e); }
  }
  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await licensesService.deactivate(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await licensesService.revoke(String(req.params.id), String(req.body.reason), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async renew(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await licensesService.renew(String(req.params.id), String(req.body.expiresAt), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async getMyLicenses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await licensesService.getMyLicenses(uid) }); } catch (e) { next(e); }
  }
}
export const licensesController = new LicensesController();