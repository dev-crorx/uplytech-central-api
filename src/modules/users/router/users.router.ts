import { Router } from 'express';
import { usersController } from '../controller/users.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => usersController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => usersController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => usersController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'users') as never, (req, res, next) => usersController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'users') as never, (req, res, next) => usersController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'users') as never, (req, res, next) => usersController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'users') as never, (req, res, next) => usersController.delete(req, res, next));

export { router as usersRouter };
