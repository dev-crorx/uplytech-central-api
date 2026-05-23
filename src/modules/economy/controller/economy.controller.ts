import { Request, Response, NextFunction } from 'express';
import { economyService } from '../service/economy.service';
import { parsePagination } from '../../../core/utils';

export class EconomyController {
  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await economyService.getBalance(uid) }); } catch (e) { next(e); }
  }
  async deposit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await economyService.deposit(String(req.body.userId), Number(req.body.amount), String(req.body.reason), uid) }); } catch (e) { next(e); }
  }
  async withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await economyService.withdraw(uid, Number(req.body.amount), String(req.body.reason || '')) }); } catch (e) { next(e); }
  }
  async transfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await economyService.transfer(uid, String(req.body.toUserId), Number(req.body.amount), String(req.body.description || '')) }); } catch (e) { next(e); }
  }
  async purchaseCurrency(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await economyService.purchaseCurrency(uid, Number(req.body.amount), String(req.body.paymentId)) }); } catch (e) { next(e); }
  }
  async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await economyService.getTransactionHistory(uid, p) }); } catch (e) { next(e); }
  }
  async getCurrencies(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await economyService.getCurrencies() }); } catch (e) { next(e); }
  }
  async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await economyService.getLeaderboard(Number(req.query.limit || 50)) }); } catch (e) { next(e); }
  }
}
export const economyController = new EconomyController();