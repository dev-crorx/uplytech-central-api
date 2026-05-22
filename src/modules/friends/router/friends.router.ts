import { Router } from 'express';
import { friendsController } from '../controller/friends.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => friendsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => friendsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => friendsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'friends') as never, (req, res, next) => friendsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'friends') as never, (req, res, next) => friendsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'friends') as never, (req, res, next) => friendsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'friends') as never, (req, res, next) => friendsController.delete(req, res, next));

export { router as friendsRouter };
