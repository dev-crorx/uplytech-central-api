import { Request, Response, NextFunction } from 'express';
import { usersService } from '../service/users.service';
import { parsePagination } from '../../../core/utils';

export class UsersController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = parsePagination(req.query as Record<string, unknown>);
      const filters = {
        status: req.query.status ? String(req.query.status) : undefined,
        role: req.query.role ? String(req.query.role) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      };
      const result = await usersService.findAll(params, filters);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await usersService.findById(String(req.params.id));
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const profile = await usersService.getProfile(userId);
      res.json({ success: true, data: profile });
    } catch (error) { next(error); }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const profile = await usersService.updateProfile(userId, req.body);
      res.json({ success: true, data: profile, message: 'Profile updated' });
    } catch (error) { next(error); }
  }

  async banUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = (req as unknown as { user: { id: string } }).user.id;
      await usersService.banUser(String(req.params.id), adminId, String(req.body.reason || ''));
      res.json({ success: true, message: 'User banned' });
    } catch (error) { next(error); }
  }

  async unbanUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = (req as unknown as { user: { id: string } }).user.id;
      await usersService.unbanUser(String(req.params.id), adminId);
      res.json({ success: true, message: 'User unbanned' });
    } catch (error) { next(error); }
  }

  async suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = (req as unknown as { user: { id: string } }).user.id;
      await usersService.suspendUser(String(req.params.id), adminId, new Date(req.body.until), String(req.body.reason || ''));
      res.json({ success: true, message: 'User suspended' });
    } catch (error) { next(error); }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await usersService.verifyEmail(String(req.params.id));
      res.json({ success: true, message: 'Email verified' });
    } catch (error) { next(error); }
  }

  async updateAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const result = await usersService.updateAvatar(userId, String(req.body.avatarUrl));
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      await usersService.setStatus(userId, String(req.body.status));
      res.json({ success: true, message: 'Status updated' });
    } catch (error) { next(error); }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = (req as unknown as { user: { id: string } }).user.id;
      await usersService.resetPassword(String(req.params.id), String(req.body.newPassword), adminId);
      res.json({ success: true, message: 'Password reset' });
    } catch (error) { next(error); }
  }

  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await usersService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) { next(error); }
  }

  async getOnlineUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await usersService.getOnlineUsers();
      res.json({ success: true, data: users });
    } catch (error) { next(error); }
  }

  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = parsePagination(req.query as Record<string, unknown>);
      const query = String(Array.isArray(req.query.q) ? req.query.q[0] : req.query.q || '');
      const result = await usersService.search(query, params);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      await usersService.deleteAccount(userId);
      res.json({ success: true, message: 'Account deleted' });
    } catch (error) { next(error); }
  }
}

export const usersController = new UsersController();
