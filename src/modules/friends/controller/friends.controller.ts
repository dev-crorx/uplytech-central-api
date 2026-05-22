import { Request, Response, NextFunction } from 'express';
import { friendsService } from '../service/friends.service';
import { parsePagination } from '../../../core/utils';

export class FriendsController {
  async getFriends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const params = parsePagination(req.query as Record<string, unknown>);
      const result = await friendsService.getFriends(userId, params);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async sendRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const request = await friendsService.sendRequest(userId, String(req.body.receiverId));
      res.status(201).json({ success: true, data: request, message: 'Friend request sent' });
    } catch (error) { next(error); }
  }

  async acceptRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      await friendsService.acceptRequest(String(req.params.id), userId);
      res.json({ success: true, message: 'Friend request accepted' });
    } catch (error) { next(error); }
  }

  async rejectRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      await friendsService.rejectRequest(String(req.params.id), userId);
      res.json({ success: true, message: 'Friend request rejected' });
    } catch (error) { next(error); }
  }

  async removeFriend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      await friendsService.removeFriend(userId, String(req.params.id));
      res.json({ success: true, message: 'Friend removed' });
    } catch (error) { next(error); }
  }

  async blockUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      await friendsService.blockUser(userId, String(req.params.id));
      res.json({ success: true, message: 'User blocked' });
    } catch (error) { next(error); }
  }

  async getPendingRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const params = parsePagination(req.query as Record<string, unknown>);
      const result = await friendsService.getPendingRequests(userId, params);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getSentRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const params = parsePagination(req.query as Record<string, unknown>);
      const result = await friendsService.getSentRequests(userId, params);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getMutualFriends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as unknown as { user: { id: string } }).user.id;
      const mutual = await friendsService.getMutualFriends(userId, String(req.params.id));
      res.json({ success: true, data: mutual });
    } catch (error) { next(error); }
  }
}

export const friendsController = new FriendsController();