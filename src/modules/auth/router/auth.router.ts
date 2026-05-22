import { Router } from 'express';
import { authController } from '../controller/auth.controller';
import { authenticate } from '../../../core/middleware/auth';
import { validate } from '../../../core/middleware/validate';
import { authRateLimiter } from '../../../core/middleware/rateLimiter';
import { auditLog } from '../../../core/middleware/audit';
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

router.post('/register', authRateLimiter, validate(registerSchema), auditLog('REGISTER', 'auth') as never, (req, res, next) => authController.register(req as never, res, next));
router.post('/login', authRateLimiter, validate(loginSchema), auditLog('LOGIN', 'auth') as never, (req, res, next) => authController.login(req as never, res, next));
router.post('/logout', authenticate as never, auditLog('LOGOUT', 'auth') as never, (req, res, next) => authController.logout(req as never, res, next));
router.post('/refresh', validate(refreshTokenSchema), (req, res, next) => authController.refreshToken(req as never, res, next));
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

// Two-Factor
router.post('/2fa/enable', authenticate as never, auditLog('ENABLE_2FA', 'auth') as never, (req, res, next) => authController.enableTwoFactor(req as never, res, next));
router.post('/2fa/disable', authenticate as never, validate(disableTwoFactorSchema), auditLog('DISABLE_2FA', 'auth') as never, (req, res, next) => authController.disableTwoFactor(req as never, res, next));

export { router as authRouter };
