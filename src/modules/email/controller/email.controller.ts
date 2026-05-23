import { Request, Response, NextFunction } from 'express';
import { emailService } from '../service/email.service';
import { parsePagination } from '../../../core/utils';

export class EmailController {
  async getInbox(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await emailService.getInbox(uid, p) }); } catch (e) { next(e); }
  }
  async getSent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await emailService.getSent(uid, p) }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await emailService.findById(String(req.params.id), uid) }); } catch (e) { next(e); }
  }
  async send(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await emailService.send(req.body, uid) }); } catch (e) { next(e); }
  }
  async sendExternal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await emailService.sendExternal(req.body, uid) }); } catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await emailService.delete(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await emailService.markAsRead(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async markAsUnread(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await emailService.markAsUnread(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const count = await emailService.getUnreadCount(uid); res.json({ success: true, data: { count } }); } catch (e) { next(e); }
  }
  async getTemplates(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await emailService.getTemplates() }); } catch (e) { next(e); }
  }
  async createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await emailService.createTemplate(req.body, uid) }); } catch (e) { next(e); }
  }
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await emailService.search(uid, String(req.query.q || ''), p) }); } catch (e) { next(e); }
  }
}
export const emailController = new EmailController();