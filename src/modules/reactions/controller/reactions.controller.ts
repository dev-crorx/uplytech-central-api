import { Request, Response, NextFunction } from 'express';
import { reactionsService } from '../service/reactions.service';
import { parsePagination } from '../../../core/utils';

export class ReactionsController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = parsePagination(req.query as Record<string, unknown>);
      const filters: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(req.query)) {
        if (!['page', 'limit', 'sortBy', 'sortOrder'].includes(key) && value) {
          filters[key] = value;
        }
      }

      const result = await reactionsService.findAll(params, filters);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await reactionsService.findById(String(req.params.id));
      res.status(200).json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user?: { id: string } }).user?.id;
      const record = await reactionsService.create(req.body, userId);
      res.status(201).json({ success: true, data: record, message: 'Reaction created successfully' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user?: { id: string } }).user?.id;
      const record = await reactionsService.update(String(req.params.id), req.body, userId);
      res.status(200).json({ success: true, data: record, message: 'Reaction updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user?: { id: string } }).user?.id;
      await reactionsService.delete(String(req.params.id), userId);
      res.status(200).json({ success: true, message: 'Reaction deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = parsePagination(req.query as Record<string, unknown>);
      const query = String(Array.isArray(req.query.q) ? req.query.q[0] : req.query.q || '');
      const result = await reactionsService.search(query, params);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const reactionsController = new ReactionsController();
