import { Router } from 'express';
import { chatController } from '../controller/chat.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => chatController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => chatController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => chatController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'chat') as never, (req, res, next) => chatController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'chat') as never, (req, res, next) => chatController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'chat') as never, (req, res, next) => chatController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'chat') as never, (req, res, next) => chatController.delete(req, res, next));

export { router as chatRouter };
