import { Router } from 'express';
import { devicesController } from '../controller/devices.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => devicesController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => devicesController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => devicesController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'devices') as never, (req, res, next) => devicesController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'devices') as never, (req, res, next) => devicesController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'devices') as never, (req, res, next) => devicesController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'devices') as never, (req, res, next) => devicesController.delete(req, res, next));

export { router as devicesRouter };
