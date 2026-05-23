import { Request, Response, NextFunction } from 'express';
import { brainService } from '../service/brain.service';
import { parsePagination } from '../../../core/utils';

export class BrainController {
  async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await brainService.chat(uid, String(req.body.message), req.body.conversationId || undefined) }); } catch (e) { next(e); }
  }
  async train(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await brainService.train(req.body, uid) }); } catch (e) { next(e); }
  }
  async trainBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await brainService.trainBatch(req.body.entries, uid) }); } catch (e) { next(e); }
  }
  async getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await brainService.getConversations(uid, p) }); } catch (e) { next(e); }
  }
  async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await brainService.getConversation(String(req.params.id), uid) }); } catch (e) { next(e); }
  }
  async deleteConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await brainService.deleteConversation(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async getKnowledge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await brainService.getKnowledge(p, req.query.category ? String(req.query.category) : undefined) }); } catch (e) { next(e); }
  }
  async deleteKnowledge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await brainService.deleteKnowledge(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async getPersonality(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await brainService.getPersonality() }); } catch (e) { next(e); }
  }
  async updatePersonality(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await brainService.updatePersonality(req.body, uid) }); } catch (e) { next(e); }
  }
  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await brainService.getStats() }); } catch (e) { next(e); }
  }
}
export const brainController = new BrainController();