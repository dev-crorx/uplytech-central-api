import { Request, Response, NextFunction } from 'express';
import { invoicesService } from '../service/invoices.service';
import { parsePagination } from '../../../core/utils';

export class InvoicesController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const f = { status: req.query.status ? String(req.query.status) : undefined, userId: req.query.userId ? String(req.query.userId) : undefined }; res.json({ success: true, ...await invoicesService.findAll(p, f) }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await invoicesService.findById(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await invoicesService.create(req.body, uid) }); } catch (e) { next(e); }
  }
  async markAsPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await invoicesService.markAsPaid(String(req.params.id), uid); res.json({ success: true, message: 'Invoice marked as paid' }); } catch (e) { next(e); }
  }
  async markAsOverdue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await invoicesService.markAsOverdue(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await invoicesService.cancel(String(req.params.id), uid); res.json({ success: true }); } catch (e) { next(e); }
  }
  async sendReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await invoicesService.sendReminder(String(req.params.id), uid); res.json({ success: true, message: 'Reminder sent' }); } catch (e) { next(e); }
  }
  async getMyInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await invoicesService.getMyInvoices(uid, p) }); } catch (e) { next(e); }
  }
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const s = req.query.startDate ? new Date(String(req.query.startDate)) : undefined; const e = req.query.endDate ? new Date(String(req.query.endDate)) : undefined; res.json({ success: true, data: await invoicesService.getStats(s, e) }); } catch (e) { next(e); }
  }
}
export const invoicesController = new InvoicesController();