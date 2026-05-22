import { Router } from 'express';
import { tournamentsController } from '../controller/tournaments.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => tournamentsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => tournamentsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => tournamentsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'tournaments') as never, (req, res, next) => tournamentsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'tournaments') as never, (req, res, next) => tournamentsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'tournaments') as never, (req, res, next) => tournamentsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'tournaments') as never, (req, res, next) => tournamentsController.delete(req, res, next));

export { router as tournamentsRouter };
