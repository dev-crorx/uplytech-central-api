import { Request, Response, NextFunction } from 'express';
import { devicesService } from '../service/devices.service';
import { parsePagination } from '../../../core/utils';

export class DevicesController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const f = { type: req.query.type ? String(req.query.type) : undefined, status: req.query.status ? String(req.query.status) : undefined, userId: req.query.userId ? String(req.query.userId) : undefined }; res.json({ success: true, ...await devicesService.findAll(p, f) }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await devicesService.findById(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await devicesService.register(req.body, uid) }); } catch (e) { next(e); }
  }
  async heartbeat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await devicesService.heartbeat(String(req.params.id), req.body) }); } catch (e) { next(e); }
  }
  async deregister(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await devicesService.deregister(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await devicesService.update(String(req.params.id), req.body, uid) }); } catch (e) { next(e); }
  }
  async getMyDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await devicesService.getMyDevices(uid) }); } catch (e) { next(e); }
  }
  async setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await devicesService.setStatus(String(req.params.id), String(req.body.status), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
}
export const devicesController = new DevicesController();