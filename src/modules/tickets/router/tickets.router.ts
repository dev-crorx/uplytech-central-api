import { Router } from 'express';
import { ticketsController } from '../controller/tickets.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => ticketsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => ticketsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => ticketsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'tickets') as never, (req, res, next) => ticketsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'tickets') as never, (req, res, next) => ticketsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'tickets') as never, (req, res, next) => ticketsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'tickets') as never, (req, res, next) => ticketsController.delete(req, res, next));

export { router as ticketsRouter };
