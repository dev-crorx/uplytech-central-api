import { Router } from 'express';
import { archiveController } from '../controller/archive.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => archiveController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => archiveController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => archiveController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'archive') as never, (req, res, next) => archiveController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'archive') as never, (req, res, next) => archiveController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'archive') as never, (req, res, next) => archiveController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'archive') as never, (req, res, next) => archiveController.delete(req, res, next));

export { router as archiveRouter };
