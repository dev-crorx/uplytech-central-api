import { Router } from 'express';
import { analyticsController } from '../controller/analytics.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => analyticsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => analyticsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => analyticsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'analytics') as never, (req, res, next) => analyticsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'analytics') as never, (req, res, next) => analyticsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'analytics') as never, (req, res, next) => analyticsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'analytics') as never, (req, res, next) => analyticsController.delete(req, res, next));

export { router as analyticsRouter };
