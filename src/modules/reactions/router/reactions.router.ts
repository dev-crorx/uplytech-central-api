import { Router } from 'express';
import { reactionsController } from '../controller/reactions.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => reactionsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => reactionsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => reactionsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'reactions') as never, (req, res, next) => reactionsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'reactions') as never, (req, res, next) => reactionsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'reactions') as never, (req, res, next) => reactionsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'reactions') as never, (req, res, next) => reactionsController.delete(req, res, next));

export { router as reactionsRouter };
