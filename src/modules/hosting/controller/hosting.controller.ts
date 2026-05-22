import { Request, Response, NextFunction } from 'express';
import { hostingService } from '../service/hosting.service';
import { parsePagination } from '../../../core/utils';

export class HostingController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const f = { status: req.query.status ? String(req.query.status) : undefined, type: req.query.type ? String(req.query.type) : undefined }; res.json({ success: true, ...await hostingService.findAll(p, f) }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await hostingService.findById(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async provision(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await hostingService.provision(req.body, uid) }); } catch (e) { next(e); }
  }
  async start(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await hostingService.start(String(req.params.id), uid); res.json({ success: true, message: 'Instance started' }); } catch (e) { next(e); }
  }
  async stop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await hostingService.stop(String(req.params.id), uid); res.json({ success: true, message: 'Instance stopped' }); } catch (e) { next(e); }
  }
  async restart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await hostingService.restart(String(req.params.id), uid); res.json({ success: true, message: 'Instance restarted' }); } catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await hostingService.delete(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await hostingService.getLogs(String(req.params.id), Number(req.query.lines || 100)) }); } catch (e) { next(e); }
  }
  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await hostingService.getMetrics(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await hostingService.updateConfig(String(req.params.id), req.body, uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async getMyInstances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await hostingService.getMyInstances(uid) }); } catch (e) { next(e); }
  }
}
export const hostingController = new HostingController();