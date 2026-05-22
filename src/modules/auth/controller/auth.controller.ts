import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../core/types';
import { authService } from '../service/auth.service';

export class AuthController {
  async register(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login({
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.headers.authorization?.substring(7) || '';
      await authService.logout(req.user!.id, token);
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshToken(refreshToken);
      res.status(200).json({
        success: true,
        data: tokens,
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user!.id, currentPassword, newPassword);
      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async createApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, scopes, expiresIn, isBeta } = req.body;
      const result = await authService.createApiKey(req.user!.id, name, scopes, expiresIn, isBeta);
      res.status(201).json({
        success: true,
        data: result,
        message: 'API key created. Store the key securely, it will not be shown again.',
      });
    } catch (error) {
      next(error);
    }
  }

  async revokeApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.revokeApiKey(req.user!.id, String(req.params.id));
      res.status(200).json({
        success: true,
        message: 'API key revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async listApiKeys(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const keys = await authService.listApiKeys(req.user!.id);
      res.status(200).json({
        success: true,
        data: keys,
      });
    } catch (error) {
      next(error);
    }
  }

  async listSessions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await authService.listSessions(req.user!.id);
      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.revokeSession(req.user!.id, String(req.params.id));
      res.status(200).json({
        success: true,
        message: 'Session revoked',
      });
    } catch (error) {
      next(error);
    }
  }

  async revokeAllSessions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.revokeAllSessions(req.user!.id);
      res.status(200).json({
        success: true,
        message: 'All sessions revoked',
      });
    } catch (error) {
      next(error);
    }
  }

  async registerPasskey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { credentialId, publicKey, name } = req.body;
      await authService.registerPasskey(req.user!.id, credentialId, publicKey, name);
      res.status(201).json({
        success: true,
        message: 'Passkey registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async listPasskeys(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const passkeys = await authService.listPasskeys(req.user!.id);
      res.status(200).json({
        success: true,
        data: passkeys,
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePasskey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.deletePasskey(req.user!.id, String(req.params.id));
      res.status(200).json({
        success: true,
        message: 'Passkey deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  async enableTwoFactor(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.enableTwoFactor(req.user!.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Two-factor authentication enabled',
      });
    } catch (error) {
      next(error);
    }
  }

  async disableTwoFactor(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { password } = req.body;
      await authService.disableTwoFactor(req.user!.id, password);
      res.status(200).json({
        success: true,
        message: 'Two-factor authentication disabled',
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: req.user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
