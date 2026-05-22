import { Router } from 'express';
import { gamesController } from '../controller/games.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => gamesController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => gamesController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => gamesController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'games') as never, (req, res, next) => gamesController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'games') as never, (req, res, next) => gamesController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'games') as never, (req, res, next) => gamesController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'games') as never, (req, res, next) => gamesController.delete(req, res, next));

export { router as gamesRouter };
