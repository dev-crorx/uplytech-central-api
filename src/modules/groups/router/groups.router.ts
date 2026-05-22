import { Router } from 'express';
import { groupsController } from '../controller/groups.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => groupsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => groupsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => groupsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'groups') as never, (req, res, next) => groupsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'groups') as never, (req, res, next) => groupsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'groups') as never, (req, res, next) => groupsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'groups') as never, (req, res, next) => groupsController.delete(req, res, next));

export { router as groupsRouter };
