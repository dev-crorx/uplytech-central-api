import { Router } from 'express';
import { hostingController } from '../controller/hosting.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => hostingController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => hostingController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => hostingController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'hosting') as never, (req, res, next) => hostingController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'hosting') as never, (req, res, next) => hostingController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'hosting') as never, (req, res, next) => hostingController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'hosting') as never, (req, res, next) => hostingController.delete(req, res, next));

export { router as hostingRouter };
