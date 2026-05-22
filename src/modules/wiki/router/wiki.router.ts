import { Router } from 'express';
import { wikiController } from '../controller/wiki.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => wikiController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => wikiController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => wikiController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'wiki') as never, (req, res, next) => wikiController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'wiki') as never, (req, res, next) => wikiController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'wiki') as never, (req, res, next) => wikiController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'wiki') as never, (req, res, next) => wikiController.delete(req, res, next));

export { router as wikiRouter };
