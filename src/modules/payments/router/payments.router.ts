import { Router } from 'express';
import { paymentsController } from '../controller/payments.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => paymentsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => paymentsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => paymentsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'payments') as never, (req, res, next) => paymentsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'payments') as never, (req, res, next) => paymentsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'payments') as never, (req, res, next) => paymentsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'payments') as never, (req, res, next) => paymentsController.delete(req, res, next));

export { router as paymentsRouter };
