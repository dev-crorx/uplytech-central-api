import { Router } from 'express';
import { licensesController } from '../controller/licenses.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => licensesController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => licensesController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => licensesController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'licenses') as never, (req, res, next) => licensesController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'licenses') as never, (req, res, next) => licensesController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'licenses') as never, (req, res, next) => licensesController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'licenses') as never, (req, res, next) => licensesController.delete(req, res, next));

export { router as licensesRouter };
