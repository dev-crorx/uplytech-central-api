import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../service/analytics.service';
import { parsePagination } from '../../../core/utils';

export class AnalyticsController {
  async trackEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(201).json({ success: true, data: await analyticsService.trackEvent({ ...req.body, ip: req.ip, userAgent: req.headers['user-agent'] }) }); } catch (e) { next(e); }
  }
  async getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const f = { event: req.query.event ? String(req.query.event) : undefined, userId: req.query.userId ? String(req.query.userId) : undefined, source: req.query.source ? String(req.query.source) : undefined, startDate: req.query.startDate ? new Date(String(req.query.startDate)) : undefined, endDate: req.query.endDate ? new Date(String(req.query.endDate)) : undefined }; res.json({ success: true, ...await analyticsService.getEvents(p, f) }); } catch (e) { next(e); }
  }
  async getEventCounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await analyticsService.getEventCounts(String(req.query.event), String(req.query.groupBy || 'day'), req.query.startDate ? new Date(String(req.query.startDate)) : undefined, req.query.endDate ? new Date(String(req.query.endDate)) : undefined) }); } catch (e) { next(e); }
  }
  async getUniqueUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await analyticsService.getUniqueUsers(req.query.startDate ? new Date(String(req.query.startDate)) : undefined, req.query.endDate ? new Date(String(req.query.endDate)) : undefined) }); } catch (e) { next(e); }
  }
  async getTopEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await analyticsService.getTopEvents(Number(req.query.limit || 20)) }); } catch (e) { next(e); }
  }
  async getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await analyticsService.getDashboard() }); } catch (e) { next(e); }
  }
}
export const analyticsController = new AnalyticsController();