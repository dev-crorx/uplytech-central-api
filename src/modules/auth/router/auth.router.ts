import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { authController } from '../controller/auth.controller';
import { authenticate } from '../../../core/middleware/auth';
import { validate } from '../../../core/middleware/validate';
import { authRateLimiter } from '../../../core/middleware/rateLimiter';
import { auditLog } from '../../../core/middleware/audit';
import { authService } from '../service/auth.service';
import { getEnabledProviders, OAUTH_PROVIDERS } from '../oauth/providers';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  refreshTokenSchema,
  createApiKeySchema,
  registerPasskeySchema,
  disableTwoFactorSchema,
} from '../validators/auth.validators';

const router = Router();

// Public auth endpoints
router.post('/register', authRateLimiter, validate(registerSchema), auditLog('REGISTER', 'auth') as never, (req, res, next) => authController.register(req as never, res, next));
router.post('/login', authRateLimiter, validate(loginSchema), auditLog('LOGIN', 'auth') as never, (req, res, next) => authController.login(req as never, res, next));
router.post('/refresh', validate(refreshTokenSchema), (req, res, next) => authController.refreshToken(req as never, res, next));

// Authenticated endpoints
router.post('/logout', authenticate as never, auditLog('LOGOUT', 'auth') as never, (req, res, next) => authController.logout(req as never, res, next));
router.post('/change-password', authenticate as never, validate(changePasswordSchema), auditLog('CHANGE_PASSWORD', 'auth') as never, (req, res, next) => authController.changePassword(req as never, res, next));
router.get('/me', authenticate as never, (req, res, next) => authController.getMe(req as never, res, next));

// API Keys
router.post('/api-keys', authenticate as never, validate(createApiKeySchema), auditLog('CREATE_API_KEY', 'api_key') as never, (req, res, next) => authController.createApiKey(req as never, res, next));
router.get('/api-keys', authenticate as never, (req, res, next) => authController.listApiKeys(req as never, res, next));
router.delete('/api-keys/:id', authenticate as never, auditLog('REVOKE_API_KEY', 'api_key') as never, (req, res, next) => authController.revokeApiKey(req as never, res, next));

// Sessions
router.get('/sessions', authenticate as never, (req, res, next) => authController.listSessions(req as never, res, next));
router.delete('/sessions/:id', authenticate as never, auditLog('REVOKE_SESSION', 'session') as never, (req, res, next) => authController.revokeSession(req as never, res, next));
router.delete('/sessions', authenticate as never, auditLog('REVOKE_ALL_SESSIONS', 'session') as never, (req, res, next) => authController.revokeAllSessions(req as never, res, next));

// Passkeys
router.post('/passkeys', authenticate as never, validate(registerPasskeySchema), auditLog('REGISTER_PASSKEY', 'passkey') as never, (req, res, next) => authController.registerPasskey(req as never, res, next));
router.get('/passkeys', authenticate as never, (req, res, next) => authController.listPasskeys(req as never, res, next));
router.delete('/passkeys/:id', authenticate as never, auditLog('DELETE_PASSKEY', 'passkey') as never, (req, res, next) => authController.deletePasskey(req as never, res, next));

// Two-Factor Authentication
router.post('/2fa/enable', authenticate as never, auditLog('ENABLE_2FA', 'auth') as never, (req, res, next) => authController.enableTwoFactor(req as never, res, next));
router.post('/2fa/disable', authenticate as never, validate(disableTwoFactorSchema), auditLog('DISABLE_2FA', 'auth') as never, (req, res, next) => authController.disableTwoFactor(req as never, res, next));

// List available OAuth providers
router.get('/oauth/providers', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      available: OAUTH_PROVIDERS,
      enabled: getEnabledProviders(),
    },
  });
});

// Dynamic OAuth routes for each provider
const oauthProviders = ['google', 'github', 'discord', 'twitter', 'facebook', 'apple', 'microsoft', 'twitch', 'spotify', 'linkedin', 'gitlab', 'slack', 'steam'];

for (const provider of oauthProviders) {
  router.get(
    `/oauth/${provider}`,
    authRateLimiter,
    (req: Request, res: Response, next: NextFunction) => {
      const enabled = getEnabledProviders();
      if (!enabled.includes(provider)) {
        res.status(404).json({ success: false, message: `OAuth provider '${provider}' is not configured` });
        return;
      }
      passport.authenticate(provider, {
        scope: getProviderScopes(provider),
        session: false,
      })(req, res, next);
    }
  );

  router.get(
    `/oauth/${provider}/callback`,
    (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate(provider, { session: false, failureRedirect: '/auth/login?error=oauth_failed' }, async (err: Error | null, profile: { provider: string; providerId: string; email: string; displayName: string; avatar?: string } | null) => {
        try {
          if (err || !profile) {
            res.status(401).json({ success: false, message: 'OAuth authentication failed', error: err?.message });
            return;
          }

          const result = await authService.handleOAuthLogin(
            profile.provider,
            profile.providerId,
            { email: profile.email, displayName: profile.displayName, avatar: profile.avatar },
            req.ip || undefined
          );

          res.json({ success: true, data: result, message: `Successfully authenticated with ${provider}` });
        } catch (error) {
          next(error);
        }
      })(req, res, next);
    }
  );
}

// Connected OAuth accounts management
router.get('/oauth/accounts', authenticate as never, async (req, res, next) => {
  try {
    const userId = (req as never as { user: { id: string } }).user.id;
    const accounts = await authService.listOAuthAccounts(userId);
    res.json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
});

router.delete('/oauth/accounts/:provider', authenticate as never, auditLog('UNLINK_OAUTH', 'oauth') as never, async (req, res, next) => {
  try {
    const userId = (req as never as { user: { id: string } }).user.id;
    await authService.unlinkOAuthAccount(userId, String(req.params.provider));
    res.json({ success: true, message: `${String(req.params.provider)} account unlinked` });
  } catch (error) {
    next(error);
  }
});

function getProviderScopes(provider: string): string[] {
  const scopes: Record<string, string[]> = {
    google: ['profile', 'email'],
    github: ['user:email', 'read:user'],
    discord: ['identify', 'email', 'guilds'],
    twitter: [],
    facebook: ['email', 'public_profile'],
    apple: ['name', 'email'],
    microsoft: ['user.read', 'email'],
    twitch: ['user:read:email'],
    spotify: ['user-read-email', 'user-read-private'],
    linkedin: ['r_emailaddress', 'r_liteprofile'],
    gitlab: ['read_user', 'email'],
    slack: ['identity.basic', 'identity.email', 'identity.avatar'],
    steam: [],
  };
  return scopes[provider] || [];
}

export { router as authRouter };
