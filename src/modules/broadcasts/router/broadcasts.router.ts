import { Router } from 'express';
import { broadcastsController } from '../controller/broadcasts.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => broadcastsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => broadcastsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => broadcastsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'broadcasts') as never, (req, res, next) => broadcastsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'broadcasts') as never, (req, res, next) => broadcastsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'broadcasts') as never, (req, res, next) => broadcastsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'broadcasts') as never, (req, res, next) => broadcastsController.delete(req, res, next));

export { router as broadcastsRouter };
