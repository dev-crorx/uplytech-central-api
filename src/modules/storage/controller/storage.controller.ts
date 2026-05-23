import { Request, Response, NextFunction } from 'express';
import { storageService } from '../service/storage.service';
import { parsePagination } from '../../../core/utils';

export class StorageController {
  async getFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await storageService.getFiles(uid, p, req.query.folderId ? String(req.query.folderId) : undefined) }); } catch (e) { next(e); }
  }
  async getFileById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await storageService.getFileById(String(req.params.id), uid) }); } catch (e) { next(e); }
  }
  async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await storageService.uploadFile(req.body, uid) }); } catch (e) { next(e); }
  }
  async createFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await storageService.createFolder(req.body, uid) }); } catch (e) { next(e); }
  }
  async getFolders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await storageService.getFolders(uid, req.query.parentId ? String(req.query.parentId) : undefined) }); } catch (e) { next(e); }
  }
  async deleteFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await storageService.deleteFile(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async deleteFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await storageService.deleteFolder(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async rename(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await storageService.rename(String(req.params.id), String(req.body.name), uid) }); } catch (e) { next(e); }
  }
  async moveFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await storageService.moveFile(String(req.params.id), req.body.folderId || null, uid) }); } catch (e) { next(e); }
  }
  async shareFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await storageService.shareFile(String(req.params.id), String(req.body.userId), String(req.body.permission || 'READ'), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async getSharedWithMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await storageService.getSharedWithMe(uid, p) }); } catch (e) { next(e); }
  }
  async getUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await storageService.getUsage(uid) }); } catch (e) { next(e); }
  }
  async togglePublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await storageService.togglePublic(String(req.params.id), uid) }); } catch (e) { next(e); }
  }
}
export const storageController = new StorageController();