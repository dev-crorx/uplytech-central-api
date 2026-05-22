import { Router } from 'express';
import { forumController } from '../controller/forum.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => forumController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => forumController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => forumController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'forum') as never, (req, res, next) => forumController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'forum') as never, (req, res, next) => forumController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'forum') as never, (req, res, next) => forumController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'forum') as never, (req, res, next) => forumController.delete(req, res, next));

export { router as forumRouter };
