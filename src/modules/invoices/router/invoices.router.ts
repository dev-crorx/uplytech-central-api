import { Router } from 'express';
import { invoicesController } from '../controller/invoices.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => invoicesController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => invoicesController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => invoicesController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'invoices') as never, (req, res, next) => invoicesController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'invoices') as never, (req, res, next) => invoicesController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'invoices') as never, (req, res, next) => invoicesController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'invoices') as never, (req, res, next) => invoicesController.delete(req, res, next));

export { router as invoicesRouter };
