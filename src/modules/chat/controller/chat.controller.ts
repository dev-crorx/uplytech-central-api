import { Request, Response, NextFunction } from 'express';
import { chatService } from '../service/chat.service';
import { parsePagination } from '../../../core/utils';

export class ChatController {
  async getRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await chatService.getRooms(uid, p) }); } catch (e) { next(e); }
  }
  async createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await chatService.createRoom(req.body, uid) }); } catch (e) { next(e); }
  }
  async createDM(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await chatService.createDirectMessage(uid, String(req.body.userId)) }); } catch (e) { next(e); }
  }
  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await chatService.getMessages(String(req.params.id), uid, p) }); } catch (e) { next(e); }
  }
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await chatService.sendMessage(String(req.params.id), uid, String(req.body.content), String(req.body.type || 'TEXT')) }); } catch (e) { next(e); }
  }
  async deleteMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await chatService.deleteMessage(String(req.params.messageId), uid); res.json({ success: true, message: 'Message deleted' }); } catch (e) { next(e); }
  }
  async editMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await chatService.editMessage(String(req.params.messageId), uid, String(req.body.content)) }); } catch (e) { next(e); }
  }
  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await chatService.addMember(String(req.params.id), String(req.body.userId), uid); res.json({ success: true, message: 'Member added' }); } catch (e) { next(e); }
  }
  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await chatService.removeMember(String(req.params.id), String(req.params.userId), uid); res.json({ success: true, message: 'Member removed' }); } catch (e) { next(e); }
  }
  async leaveRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await chatService.leaveRoom(String(req.params.id), uid); res.json({ success: true, message: 'Left room' }); } catch (e) { next(e); }
  }
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await chatService.markAsRead(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async searchMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; void uid; const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await chatService.searchMessages(String(req.params.id), String(req.query.q || ''), p) }); } catch (e) { next(e); }
  }
  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await chatService.getUnreadCount(uid) }); } catch (e) { next(e); }
  }
}
export const chatController = new ChatController();