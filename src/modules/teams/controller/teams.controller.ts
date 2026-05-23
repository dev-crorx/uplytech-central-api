import { Request, Response, NextFunction } from 'express';
import { teamsService } from '../service/teams.service';
import { parsePagination } from '../../../core/utils';

export class TeamsController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const r = await teamsService.findAll(p); res.json({ success: true, ...r }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const r = await teamsService.findById(String(req.params.id)); res.json({ success: true, data: r }); } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const r = await teamsService.create(req.body, uid); res.status(201).json({ success: true, data: r, message: 'Team created' }); } catch (e) { next(e); }
  }
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const r = await teamsService.update(String(req.params.id), req.body, uid); res.json({ success: true, data: r }); } catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await teamsService.delete(String(req.params.id), uid); res.json({ success: true, message: 'Team deleted' }); } catch (e) { next(e); }
  }
  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await teamsService.addMember(String(req.params.id), String(req.body.userId), String(req.body.role || 'MEMBER'), uid); res.json({ success: true, message: 'Member added' }); } catch (e) { next(e); }
  }
  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await teamsService.removeMember(String(req.params.id), String(req.params.userId), uid); res.json({ success: true, message: 'Member removed' }); } catch (e) { next(e); }
  }
  async updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await teamsService.updateMemberRole(String(req.params.id), String(req.params.userId), String(req.body.role), uid); res.json({ success: true, message: 'Role updated' }); } catch (e) { next(e); }
  }
  async transferOwnership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await teamsService.transferOwnership(String(req.params.id), String(req.body.newOwnerId), uid); res.json({ success: true, message: 'Ownership transferred' }); } catch (e) { next(e); }
  }
  async getMyTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const r = await teamsService.getMyTeams(uid); res.json({ success: true, data: r }); } catch (e) { next(e); }
  }
}

export const teamsController = new TeamsController();