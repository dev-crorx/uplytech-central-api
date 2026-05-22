import { Router } from 'express';
import { whitelistsController } from '../controller/whitelists.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => whitelistsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => whitelistsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => whitelistsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'whitelists') as never, (req, res, next) => whitelistsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'whitelists') as never, (req, res, next) => whitelistsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'whitelists') as never, (req, res, next) => whitelistsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'whitelists') as never, (req, res, next) => whitelistsController.delete(req, res, next));

export { router as whitelistsRouter };
