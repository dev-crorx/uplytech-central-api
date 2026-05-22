import { Request, Response, NextFunction } from 'express';
import { blogService } from '../service/blog.service';
import { parsePagination } from '../../../core/utils';

export class BlogController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const f = { status: req.query.status ? String(req.query.status) : undefined, authorId: req.query.authorId ? String(req.query.authorId) : undefined, categoryId: req.query.categoryId ? String(req.query.categoryId) : undefined, tag: req.query.tag ? String(req.query.tag) : undefined }; res.json({ success: true, ...await blogService.findAll(p, f) }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await blogService.findById(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async findBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await blogService.findBySlug(String(req.params.slug)) }); } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await blogService.create(req.body, uid) }); } catch (e) { next(e); }
  }
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await blogService.update(String(req.params.id), req.body, uid) }); } catch (e) { next(e); }
  }
  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await blogService.publish(String(req.params.id), uid) }); } catch (e) { next(e); }
  }
  async unpublish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await blogService.unpublish(String(req.params.id), uid); res.json({ success: true, message: 'Post unpublished' }); } catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await blogService.delete(String(req.params.id), uid); res.json({ success: true, message: 'Post deleted' }); } catch (e) { next(e); }
  }
  async getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await blogService.getCategories() }); } catch (e) { next(e); }
  }
  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await blogService.createCategory(req.body, uid) }); } catch (e) { next(e); }
  }
  async getFeatured(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const limit = parseInt(String(req.query.limit || '5'), 10); res.json({ success: true, data: await blogService.getFeaturedPosts(limit) }); } catch (e) { next(e); }
  }
  async toggleFeatured(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await blogService.toggleFeatured(String(req.params.id), uid); res.json({ success: true, message: 'Featured toggled' }); } catch (e) { next(e); }
  }
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const q = String(req.query.q || ''); res.json({ success: true, ...await blogService.search(q, p) }); } catch (e) { next(e); }
  }
}
export const blogController = new BlogController();