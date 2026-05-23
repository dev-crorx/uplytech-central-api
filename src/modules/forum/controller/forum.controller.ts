import { Request, Response, NextFunction } from 'express';
import { forumService } from '../service/forum.service';
import { parsePagination } from '../../../core/utils';

export class ForumController {
  async getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await forumService.getCategories() }); } catch (e) { next(e); }
  }
  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await forumService.createCategory(req.body, uid) }); } catch (e) { next(e); }
  }
  async getPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const f = { categoryId: req.query.categoryId ? String(req.query.categoryId) : undefined }; res.json({ success: true, ...await forumService.getPosts(p, f) }); } catch (e) { next(e); }
  }
  async getPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await forumService.getPost(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await forumService.createPost(req.body, uid) }); } catch (e) { next(e); }
  }
  async updatePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await forumService.updatePost(String(req.params.id), req.body, uid) }); } catch (e) { next(e); }
  }
  async deletePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await forumService.deletePost(String(req.params.id), uid); res.json({ success: true, message: 'Post deleted' }); } catch (e) { next(e); }
  }
  async createReply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await forumService.createReply(String(req.params.id), String(req.body.content), uid) }); } catch (e) { next(e); }
  }
  async deleteReply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await forumService.deleteReply(String(req.params.replyId), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async pinPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await forumService.pinPost(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async unpinPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await forumService.unpinPost(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async lockPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await forumService.lockPost(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async unlockPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await forumService.unlockPost(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async movePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await forumService.movePost(String(req.params.id), String(req.body.categoryId), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async searchPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await forumService.searchPosts(String(req.query.q || ''), p) }); } catch (e) { next(e); }
  }
}
export const forumController = new ForumController();