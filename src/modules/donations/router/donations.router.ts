import { Router } from 'express';
import { donationsController } from '../controller/donations.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => donationsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => donationsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => donationsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'donations') as never, (req, res, next) => donationsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'donations') as never, (req, res, next) => donationsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'donations') as never, (req, res, next) => donationsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'donations') as never, (req, res, next) => donationsController.delete(req, res, next));

export { router as donationsRouter };
