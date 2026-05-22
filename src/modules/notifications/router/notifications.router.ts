import { Router } from 'express';
import { notificationsController } from '../controller/notifications.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => notificationsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => notificationsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => notificationsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'notifications') as never, (req, res, next) => notificationsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'notifications') as never, (req, res, next) => notificationsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'notifications') as never, (req, res, next) => notificationsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'notifications') as never, (req, res, next) => notificationsController.delete(req, res, next));

export { router as notificationsRouter };
