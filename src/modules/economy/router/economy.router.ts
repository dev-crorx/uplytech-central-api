import { Router } from 'express';
import { economyController } from '../controller/economy.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => economyController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => economyController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => economyController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'economy') as never, (req, res, next) => economyController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'economy') as never, (req, res, next) => economyController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'economy') as never, (req, res, next) => economyController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'economy') as never, (req, res, next) => economyController.delete(req, res, next));

export { router as economyRouter };
