import { Router } from 'express';
import { accountingController } from '../controller/accounting.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => accountingController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => accountingController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => accountingController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'accounting') as never, (req, res, next) => accountingController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'accounting') as never, (req, res, next) => accountingController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'accounting') as never, (req, res, next) => accountingController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'accounting') as never, (req, res, next) => accountingController.delete(req, res, next));

export { router as accountingRouter };
