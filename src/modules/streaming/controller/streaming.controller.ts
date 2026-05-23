import { Request, Response, NextFunction } from 'express';
import { streamingService } from '../service/streaming.service';
import { parsePagination } from '../../../core/utils';

export class StreamingController {
  async getStreams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const f = { status: req.query.status ? String(req.query.status) : undefined, platform: req.query.platform ? String(req.query.platform) : undefined }; res.json({ success: true, ...await streamingService.getStreams(p, f) }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await streamingService.findById(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async createStream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await streamingService.createStream(req.body, uid) }); } catch (e) { next(e); }
  }
  async goLive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await streamingService.goLive(String(req.params.id), uid); res.json({ success: true, message: 'Stream is live' }); } catch (e) { next(e); }
  }
  async goOffline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await streamingService.goOffline(String(req.params.id), uid); res.json({ success: true, message: 'Stream is offline' }); } catch (e) { next(e); }
  }
  async updateStreamInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await streamingService.updateStreamInfo(String(req.params.id), req.body, uid) }); } catch (e) { next(e); }
  }
  async addPlatform(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await streamingService.addPlatform(String(req.params.id), String(req.body.platform), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async removePlatform(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await streamingService.removePlatform(String(req.params.id), String(req.params.platform), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async updateOBSConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await streamingService.updateOBSConfig(String(req.params.id), req.body, uid) }); } catch (e) { next(e); }
  }
  async getMyStreams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await streamingService.getMyStreams(uid) }); } catch (e) { next(e); }
  }
  async getPlatformAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await streamingService.getPlatformAccounts(uid) }); } catch (e) { next(e); }
  }
  async connectPlatformAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await streamingService.connectPlatformAccount(req.body, uid) }); } catch (e) { next(e); }
  }
  async disconnectPlatformAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await streamingService.disconnectPlatformAccount(String(req.params.platform), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
}
export const streamingController = new StreamingController();