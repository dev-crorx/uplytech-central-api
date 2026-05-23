import { Request, Response, NextFunction } from 'express';
import { permissionsService } from '../service/permissions.service';
import { parsePagination } from '../../../core/utils';

export class PermissionsController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = parsePagination(req.query as Record<string, unknown>);
      const filters = {
        resource: req.query.resource ? String(req.query.resource) : undefined,
        action: req.query.action ? String(req.query.action) : undefined,
      };
      const result = await permissionsService.findAll(params, filters);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const perm = await permissionsService.findById(String(req.params.id));
      res.json({ success: true, data: perm });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const perm = await permissionsService.create(req.body, userId);
      res.status(201).json({ success: true, data: perm, message: 'Permission created' });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const perm = await permissionsService.update(String(req.params.id), req.body, userId);
      res.json({ success: true, data: perm });
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      await permissionsService.delete(String(req.params.id), userId);
      res.json({ success: true, message: 'Permission deleted' });
    } catch (error) { next(error); }
  }

  async check(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const has = await permissionsService.checkPermission(String(req.query.userId), String(req.query.resource), String(req.query.action));
      res.json({ success: true, data: { hasPermission: has } });
    } catch (error) { next(error); }
  }

  async getByResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const perms = await permissionsService.getResourcePermissions(String(req.params.resource));
      res.json({ success: true, data: perms });
    } catch (error) { next(error); }
  }

  async bulkAssign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const result = await permissionsService.bulkAssign(String(req.params.roleId), req.body.permissionIds, userId);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export const permissionsController = new PermissionsController();