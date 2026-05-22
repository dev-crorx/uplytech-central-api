import { Router } from 'express';
import { teamsController } from '../controller/teams.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => teamsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => teamsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => teamsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'teams') as never, (req, res, next) => teamsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'teams') as never, (req, res, next) => teamsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'teams') as never, (req, res, next) => teamsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'teams') as never, (req, res, next) => teamsController.delete(req, res, next));

export { router as teamsRouter };
