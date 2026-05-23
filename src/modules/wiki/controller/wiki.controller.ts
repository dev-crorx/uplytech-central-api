import { Request, Response, NextFunction } from 'express';
import { wikiService } from '../service/wiki.service';
import { parsePagination } from '../../../core/utils';

export class WikiController {
  async getSpaces(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await wikiService.getSpaces(p) }); } catch (e) { next(e); }
  }
  async createSpace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await wikiService.createSpace(req.body, uid) }); } catch (e) { next(e); }
  }
  async getPages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await wikiService.getPages(String(req.params.spaceId), p) }); } catch (e) { next(e); }
  }
  async getPage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await wikiService.getPage(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async getPageBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await wikiService.getPageBySlug(String(req.params.spaceSlug), String(req.params.pageSlug)) }); } catch (e) { next(e); }
  }
  async createPage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await wikiService.createPage(req.body, uid) }); } catch (e) { next(e); }
  }
  async updatePage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await wikiService.updatePage(String(req.params.id), req.body, uid) }); } catch (e) { next(e); }
  }
  async getRevisions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await wikiService.getRevisions(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async revertToRevision(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await wikiService.revertToRevision(String(req.params.id), String(req.body.revisionId), uid); res.json({ success: true, message: 'Page reverted' }); } catch (e) { next(e); }
  }
  async deletePage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await wikiService.deletePage(String(req.params.id), uid); res.json({ success: true, message: 'Page deleted' }); } catch (e) { next(e); }
  }
  async searchPages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await wikiService.searchPages(String(req.query.q || ''), p) }); } catch (e) { next(e); }
  }
  async getPageTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await wikiService.getPageTree(String(req.params.spaceId)) }); } catch (e) { next(e); }
  }
}
export const wikiController = new WikiController();