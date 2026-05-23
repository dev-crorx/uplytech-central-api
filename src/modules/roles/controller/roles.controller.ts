import { Request, Response, NextFunction } from 'express';
import { rolesService } from '../service/roles.service';
import { parsePagination } from '../../../core/utils';

export class RolesController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = parsePagination(req.query as Record<string, unknown>);
      const result = await rolesService.findAll(params);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = await rolesService.findById(String(req.params.id));
      res.json({ success: true, data: role });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const role = await rolesService.create(req.body, userId);
      res.status(201).json({ success: true, data: role, message: 'Role created' });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const role = await rolesService.update(String(req.params.id), req.body, userId);
      res.json({ success: true, data: role, message: 'Role updated' });
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      await rolesService.delete(String(req.params.id), userId);
      res.json({ success: true, message: 'Role deleted' });
    } catch (error) { next(error); }
  }

  async assignToUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = (req as unknown as { user: { id: string } }).user.id;
      await rolesService.assignToUser(String(req.params.id), String(req.body.userId), adminId);
      res.json({ success: true, message: 'Role assigned to user' });
    } catch (error) { next(error); }
  }

  async removeFromUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = (req as unknown as { user: { id: string } }).user.id;
      await rolesService.removeFromUser(String(req.params.id), String(req.params.userId), adminId);
      res.json({ success: true, message: 'Role removed from user' });
    } catch (error) { next(error); }
  }

  async addPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = (req as unknown as { user: { id: string } }).user.id;
      await rolesService.addPermission(String(req.params.id), String(req.body.permissionId), adminId);
      res.json({ success: true, message: 'Permission added to role' });
    } catch (error) { next(error); }
  }

  async removePermission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = (req as unknown as { user: { id: string } }).user.id;
      await rolesService.removePermission(String(req.params.id), String(req.params.permissionId), adminId);
      res.json({ success: true, message: 'Permission removed from role' });
    } catch (error) { next(error); }
  }

  async getUserRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await rolesService.getUserRoles(String(req.params.userId));
      res.json({ success: true, data: roles });
    } catch (error) { next(error); }
  }
}

export const rolesController = new RolesController();
