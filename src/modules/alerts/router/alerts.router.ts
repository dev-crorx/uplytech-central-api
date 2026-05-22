import { Router } from 'express';
import { alertsController } from '../controller/alerts.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => alertsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => alertsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => alertsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'alerts') as never, (req, res, next) => alertsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'alerts') as never, (req, res, next) => alertsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'alerts') as never, (req, res, next) => alertsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'alerts') as never, (req, res, next) => alertsController.delete(req, res, next));

export { router as alertsRouter };
