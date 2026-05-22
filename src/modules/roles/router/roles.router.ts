import { Router } from 'express';
import { rolesController } from '../controller/roles.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => rolesController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => rolesController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => rolesController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'roles') as never, (req, res, next) => rolesController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'roles') as never, (req, res, next) => rolesController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'roles') as never, (req, res, next) => rolesController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'roles') as never, (req, res, next) => rolesController.delete(req, res, next));

export { router as rolesRouter };
