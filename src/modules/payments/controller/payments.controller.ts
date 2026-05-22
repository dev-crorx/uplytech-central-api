import { Request, Response, NextFunction } from 'express';
import { paymentsService } from '../service/payments.service';
import { parsePagination } from '../../../core/utils';

export class PaymentsController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const f = { status: req.query.status ? String(req.query.status) : undefined, userId: req.query.userId ? String(req.query.userId) : undefined, method: req.query.method ? String(req.query.method) : undefined }; res.json({ success: true, ...await paymentsService.findAll(p, f) }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await paymentsService.findById(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async createPaymentIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await paymentsService.createPaymentIntent({ ...req.body, userId: uid }) }); } catch (e) { next(e); }
  }
  async confirmPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await paymentsService.confirmPayment(String(req.params.id), uid) }); } catch (e) { next(e); }
  }
  async refund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await paymentsService.refund(String(req.params.id), req.body.amount, String(req.body.reason), uid) }); } catch (e) { next(e); }
  }
  async cancelPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await paymentsService.cancelPayment(String(req.params.id), uid); res.json({ success: true, message: 'Payment cancelled' }); } catch (e) { next(e); }
  }
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await paymentsService.handleStripeWebhook(req.body); res.json({ received: true }); } catch (e) { next(e); }
  }
  async getMyPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await paymentsService.getMyPayments(uid, p) }); } catch (e) { next(e); }
  }
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const start = req.query.startDate ? new Date(String(req.query.startDate)) : undefined; const end = req.query.endDate ? new Date(String(req.query.endDate)) : undefined; res.json({ success: true, data: await paymentsService.getStats(start, end) }); } catch (e) { next(e); }
  }
}
export const paymentsController = new PaymentsController();