import { Router } from 'express';
import { metricsController } from '../controller/metrics.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => metricsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => metricsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => metricsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'metrics') as never, (req, res, next) => metricsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'metrics') as never, (req, res, next) => metricsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'metrics') as never, (req, res, next) => metricsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'metrics') as never, (req, res, next) => metricsController.delete(req, res, next));

export { router as metricsRouter };
