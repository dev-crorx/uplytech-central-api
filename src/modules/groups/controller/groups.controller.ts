import { Request, Response, NextFunction } from 'express';
import { groupsService } from '../service/groups.service';
import { parsePagination } from '../../../core/utils';

export class GroupsController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const r = await groupsService.findAll(p, { isPublic: req.query.isPublic === 'true' ? true : undefined }); res.json({ success: true, ...r }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await groupsService.findById(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const r = await groupsService.create(req.body, uid); res.status(201).json({ success: true, data: r }); } catch (e) { next(e); }
  }
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const r = await groupsService.update(String(req.params.id), req.body, uid); res.json({ success: true, data: r }); } catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await groupsService.delete(String(req.params.id), uid); res.json({ success: true, message: 'Group deleted' }); } catch (e) { next(e); }
  }
  async join(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await groupsService.join(String(req.params.id), uid); res.json({ success: true, message: 'Joined group' }); } catch (e) { next(e); }
  }
  async leave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await groupsService.leave(String(req.params.id), uid); res.json({ success: true, message: 'Left group' }); } catch (e) { next(e); }
  }
  async kickMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await groupsService.kickMember(String(req.params.id), String(req.params.userId), uid); res.json({ success: true, message: 'Member kicked' }); } catch (e) { next(e); }
  }
  async updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await groupsService.updateMemberRole(String(req.params.id), String(req.params.userId), String(req.body.role), uid); res.json({ success: true, message: 'Role updated' }); } catch (e) { next(e); }
  }
  async getMyGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await groupsService.getMyGroups(uid) }); } catch (e) { next(e); }
  }
}
export const groupsController = new GroupsController();