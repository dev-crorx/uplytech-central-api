import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../core/types';
import { brainService } from '../service/brain.service';
import { parsePagination } from '../../../core/utils';

export class BrainController {
  async query(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { input, context } = req.body;
      const result = await brainService.query(input, context, req.user?.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async teach(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { input, output, context } = req.body;
      const result = await brainService.teach(input, output, context, req.user?.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async memorize(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, key, value, weight } = req.body;
      const result = await brainService.memorize(category, key, value, weight, req.user?.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async forget(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, key } = req.body;
      const result = await brainService.forget(category, key, req.user?.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async feedback(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { interactionId, rating } = req.body;
      const result = await brainService.feedback(interactionId, rating, req.user?.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async train(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category } = req.body;
      const result = await brainService.train(category, req.user?.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async addTrainingData(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, input, output, weight } = req.body;
      const result = await brainService.addTrainingData(category, input, output, weight, req.user?.id);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async validateTrainingData(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await brainService.validateTrainingData(String(req.params.id), req.user?.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTrainingData(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = parsePagination(req.query as Record<string, unknown>);
      const category = req.query.category as string | undefined;
      const result = await brainService.getTrainingData(params, category);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getMemories(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = parsePagination(req.query as Record<string, unknown>);
      const category = req.query.category as string | undefined;
      const result = await brainService.getMemories(params, category);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getPatterns(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = parsePagination(req.query as Record<string, unknown>);
      const context = req.query.context as string | undefined;
      const result = await brainService.getPatterns(params, context);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getInteractions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = parsePagination(req.query as Record<string, unknown>);
      const userId = req.query.userId as string | undefined;
      const result = await brainService.getInteractions(params, userId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await brainService.getStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

export const brainController = new BrainController();
