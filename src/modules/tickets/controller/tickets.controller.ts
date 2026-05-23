import { Request, Response, NextFunction } from 'express';
import { ticketsService } from '../service/tickets.service';
import { parsePagination } from '../../../core/utils';

export class TicketsController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = parsePagination(req.query as Record<string, unknown>);
      const filters = {
        status: req.query.status ? String(req.query.status) : undefined,
        priority: req.query.priority ? String(req.query.priority) : undefined,
        type: req.query.type ? String(req.query.type) : undefined,
        assigneeId: req.query.assigneeId ? String(req.query.assigneeId) : undefined,
      };
      const result = await ticketsService.findAll(params, filters);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await ticketsService.findById(String(req.params.id));
      res.json({ success: true, data: ticket });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const ticket = await ticketsService.create(req.body, userId);
      res.status(201).json({ success: true, data: ticket, message: 'Ticket created' });
    } catch (error) { next(error); }
  }

  async addMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const message = await ticketsService.addMessage(String(req.params.id), String(req.body.content), userId, Boolean(req.body.isStaff));
      res.status(201).json({ success: true, data: message });
    } catch (error) { next(error); }
  }

  async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = (req as unknown as { user: { id: string } }).user.id;
      await ticketsService.assign(String(req.params.id), String(req.body.assigneeId), adminId);
      res.json({ success: true, message: 'Ticket assigned' });
    } catch (error) { next(error); }
  }

  async escalate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      await ticketsService.escalate(String(req.params.id), userId, String(req.body.reason));
      res.json({ success: true, message: 'Ticket escalated' });
    } catch (error) { next(error); }
  }

  async resolve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      await ticketsService.resolve(String(req.params.id), userId, String(req.body.resolution));
      res.json({ success: true, message: 'Ticket resolved' });
    } catch (error) { next(error); }
  }

  async close(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      await ticketsService.close(String(req.params.id), userId);
      res.json({ success: true, message: 'Ticket closed' });
    } catch (error) { next(error); }
  }

  async reopen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      await ticketsService.reopen(String(req.params.id), userId);
      res.json({ success: true, message: 'Ticket reopened' });
    } catch (error) { next(error); }
  }

  async setPriority(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      await ticketsService.setPriority(String(req.params.id), String(req.body.priority), userId);
      res.json({ success: true, message: 'Priority updated' });
    } catch (error) { next(error); }
  }

  async getMyTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const params = parsePagination(req.query as Record<string, unknown>);
      const result = await ticketsService.getMyTickets(userId, params);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getAssignedTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const params = parsePagination(req.query as Record<string, unknown>);
      const result = await ticketsService.getAssignedTickets(userId, params);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await ticketsService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) { next(error); }
  }
}

export const ticketsController = new TicketsController();