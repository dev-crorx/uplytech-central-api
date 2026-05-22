import { Router } from 'express';
import { blogController } from '../controller/blog.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => blogController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => blogController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => blogController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'blog') as never, (req, res, next) => blogController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'blog') as never, (req, res, next) => blogController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'blog') as never, (req, res, next) => blogController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'blog') as never, (req, res, next) => blogController.delete(req, res, next));

export { router as blogRouter };
