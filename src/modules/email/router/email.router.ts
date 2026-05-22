import { Router } from 'express';
import { emailController } from '../controller/email.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => emailController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => emailController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => emailController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'emails') as never, (req, res, next) => emailController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'emails') as never, (req, res, next) => emailController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'emails') as never, (req, res, next) => emailController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'emails') as never, (req, res, next) => emailController.delete(req, res, next));

export { router as emailRouter };
