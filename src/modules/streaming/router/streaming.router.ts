import { Router } from 'express';
import { streamingController } from '../controller/streaming.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => streamingController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => streamingController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => streamingController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'streaming') as never, (req, res, next) => streamingController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'streaming') as never, (req, res, next) => streamingController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'streaming') as never, (req, res, next) => streamingController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'streaming') as never, (req, res, next) => streamingController.delete(req, res, next));

export { router as streamingRouter };
