import { Router } from 'express';
import { taxController } from '../controller/tax.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => taxController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => taxController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => taxController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'tax') as never, (req, res, next) => taxController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'tax') as never, (req, res, next) => taxController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'tax') as never, (req, res, next) => taxController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'tax') as never, (req, res, next) => taxController.delete(req, res, next));

export { router as taxRouter };
