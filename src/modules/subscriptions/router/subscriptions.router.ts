import { Router } from 'express';
import { subscriptionsController } from '../controller/subscriptions.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => subscriptionsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => subscriptionsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => subscriptionsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'subscriptions') as never, (req, res, next) => subscriptionsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'subscriptions') as never, (req, res, next) => subscriptionsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'subscriptions') as never, (req, res, next) => subscriptionsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'subscriptions') as never, (req, res, next) => subscriptionsController.delete(req, res, next));

export { router as subscriptionsRouter };
