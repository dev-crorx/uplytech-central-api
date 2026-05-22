import { Router } from 'express';
import { logsController } from '../controller/logs.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => logsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => logsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => logsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'logs') as never, (req, res, next) => logsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'logs') as never, (req, res, next) => logsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'logs') as never, (req, res, next) => logsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'logs') as never, (req, res, next) => logsController.delete(req, res, next));

export { router as logsRouter };
