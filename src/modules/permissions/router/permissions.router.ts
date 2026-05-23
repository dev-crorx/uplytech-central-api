import { Router } from 'express';
import { permissionsController } from '../controller/permissions.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => permissionsController.findAll(req, res, next));
router.get('/check', authenticate as never, (req, res, next) => permissionsController.check(req, res, next));
router.get('/resource/:resource', authenticate as never, (req, res, next) => permissionsController.getByResource(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE_PERMISSION', 'permission') as never, (req, res, next) => permissionsController.create(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => permissionsController.findById(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE_PERMISSION', 'permission') as never, (req, res, next) => permissionsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE_PERMISSION', 'permission') as never, (req, res, next) => permissionsController.delete(req, res, next));
router.post('/bulk-assign/:roleId', authenticate as never, auditLog('BULK_ASSIGN_PERMISSIONS', 'permission') as never, (req, res, next) => permissionsController.bulkAssign(req, res, next));

export { router as permissionsRouter };