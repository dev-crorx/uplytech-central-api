import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../service/metrics.service';
import { parsePagination } from '../../../core/utils';

export class MetricsController {
  async record(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ success: true, data: await metricsService.record(req.body) }); } catch (e) { next(e); }
  }
  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const f = { name: req.query.name ? String(req.query.name) : undefined, source: req.query.source ? String(req.query.source) : undefined, startDate: req.query.startDate ? new Date(String(req.query.startDate)) : undefined, endDate: req.query.endDate ? new Date(String(req.query.endDate)) : undefined }; res.json({ success: true, ...await metricsService.getMetrics(p, f) }); } catch (e) { next(e); }
  }
  async getAggregated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await metricsService.getAggregated(String(req.query.name), String(req.query.aggregation || 'avg'), req.query.startDate ? new Date(String(req.query.startDate)) : undefined, req.query.endDate ? new Date(String(req.query.endDate)) : undefined) }); } catch (e) { next(e); }
  }
  async getNames(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await metricsService.getNames() }); } catch (e) { next(e); }
  }
  async getSystemMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await metricsService.getSystemMetrics() }); } catch (e) { next(e); }
  }
  async recordBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await metricsService.recordBatch(req.body.metrics) }); } catch (e) { next(e); }
  }
}
export const metricsController = new MetricsController();