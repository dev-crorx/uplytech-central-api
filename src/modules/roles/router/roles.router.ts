import { Router } from 'express';
import { rolesController } from '../controller/roles.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => rolesController.findAll(req, res, next));
router.get('/user/:userId', authenticate as never, (req, res, next) => rolesController.getUserRoles(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE_ROLE', 'role') as never, (req, res, next) => rolesController.create(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => rolesController.findById(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE_ROLE', 'role') as never, (req, res, next) => rolesController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE_ROLE', 'role') as never, (req, res, next) => rolesController.delete(req, res, next));
router.post('/:id/assign', authenticate as never, auditLog('ASSIGN_ROLE', 'role') as never, (req, res, next) => rolesController.assignToUser(req, res, next));
router.delete('/:id/users/:userId', authenticate as never, auditLog('REMOVE_ROLE', 'role') as never, (req, res, next) => rolesController.removeFromUser(req, res, next));
router.post('/:id/permissions', authenticate as never, auditLog('ADD_PERMISSION', 'role') as never, (req, res, next) => rolesController.addPermission(req, res, next));
router.delete('/:id/permissions/:permissionId', authenticate as never, auditLog('REMOVE_PERMISSION', 'role') as never, (req, res, next) => rolesController.removePermission(req, res, next));

export { router as rolesRouter };
