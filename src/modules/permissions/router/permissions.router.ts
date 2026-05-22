import { Router } from 'express';
import { permissionsController } from '../controller/permissions.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => permissionsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => permissionsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => permissionsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'permissions') as never, (req, res, next) => permissionsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'permissions') as never, (req, res, next) => permissionsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'permissions') as never, (req, res, next) => permissionsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'permissions') as never, (req, res, next) => permissionsController.delete(req, res, next));

export { router as permissionsRouter };
