import { Router } from 'express';
import { usersController } from '../controller/users.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => usersController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => usersController.search(req, res, next));
router.get('/stats', authenticate as never, (req, res, next) => usersController.getStats(req, res, next));
router.get('/online', authenticate as never, (req, res, next) => usersController.getOnlineUsers(req, res, next));
router.get('/profile', authenticate as never, (req, res, next) => usersController.getProfile(req, res, next));
router.put('/profile', authenticate as never, auditLog('UPDATE_PROFILE', 'user') as never, (req, res, next) => usersController.updateProfile(req, res, next));
router.put('/avatar', authenticate as never, auditLog('UPDATE_AVATAR', 'user') as never, (req, res, next) => usersController.updateAvatar(req, res, next));
router.put('/status', authenticate as never, (req, res, next) => usersController.setStatus(req, res, next));
router.delete('/account', authenticate as never, auditLog('DELETE_ACCOUNT', 'user') as never, (req, res, next) => usersController.deleteAccount(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => usersController.findById(req, res, next));
router.post('/:id/ban', authenticate as never, auditLog('BAN_USER', 'user') as never, (req, res, next) => usersController.banUser(req, res, next));
router.post('/:id/unban', authenticate as never, auditLog('UNBAN_USER', 'user') as never, (req, res, next) => usersController.unbanUser(req, res, next));
router.post('/:id/suspend', authenticate as never, auditLog('SUSPEND_USER', 'user') as never, (req, res, next) => usersController.suspendUser(req, res, next));
router.post('/:id/verify-email', authenticate as never, auditLog('VERIFY_EMAIL', 'user') as never, (req, res, next) => usersController.verifyEmail(req, res, next));
router.post('/:id/reset-password', authenticate as never, auditLog('RESET_PASSWORD', 'user') as never, (req, res, next) => usersController.resetPassword(req, res, next));

export { router as usersRouter };
