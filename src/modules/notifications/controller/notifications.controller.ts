import { Request, Response, NextFunction } from 'express';
import { notificationsService } from '../service/notifications.service';
import { parsePagination } from '../../../core/utils';

export class NotificationsController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const p = parsePagination(req.query as Record<string, unknown>); const unread = req.query.unread === 'true'; res.json({ success: true, ...await notificationsService.getAll(uid, p, unread) }); } catch (e) { next(e); }
  }
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await notificationsService.markAsRead(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await notificationsService.markAllAsRead(uid); res.json({ success: true, message: 'All marked as read' }); } catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await notificationsService.delete(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async deleteAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await notificationsService.deleteAll(uid); res.json({ success: true, message: 'All notifications deleted' }); } catch (e) { next(e); }
  }
  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const count = await notificationsService.getUnreadCount(uid); res.json({ success: true, data: { count } }); } catch (e) { next(e); }
  }
  async sendBulk(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const r = await notificationsService.sendBulk(req.body.userIds, String(req.body.type), String(req.body.title), String(req.body.message)); res.json({ success: true, data: r }); } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const r = await notificationsService.create(req.body); res.status(201).json({ success: true, data: r }); } catch (e) { next(e); }
  }
}
export const notificationsController = new NotificationsController();