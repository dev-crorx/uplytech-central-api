import { Request, Response, NextFunction } from 'express';
import { rolesService } from '../service/roles.service';
import { parsePagination } from '../../../core/utils';

export class RolesController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = parsePagination(req.query as Record<string, unknown>);
      const filters: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(req.query)) {
        if (!['page', 'limit', 'sortBy', 'sortOrder'].includes(key) && value) {
          filters[key] = value;
        }
      }

      const result = await rolesService.findAll(params, filters);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await rolesService.findById(String(req.params.id));
      res.status(200).json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user?: { id: string } }).user?.id;
      const record = await rolesService.create(req.body, userId);
      res.status(201).json({ success: true, data: record, message: 'Role created successfully' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user?: { id: string } }).user?.id;
      const record = await rolesService.update(String(req.params.id), req.body, userId);
      res.status(200).json({ success: true, data: record, message: 'Role updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user?: { id: string } }).user?.id;
      await rolesService.delete(String(req.params.id), userId);
      res.status(200).json({ success: true, message: 'Role deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = parsePagination(req.query as Record<string, unknown>);
      const query = String(Array.isArray(req.query.q) ? req.query.q[0] : req.query.q || '');
      const result = await rolesService.search(query, params);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const rolesController = new RolesController();
