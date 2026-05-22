import { Router } from 'express';
import { ticketsController } from '../controller/tickets.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => ticketsController.findAll(req, res, next));
router.get('/my', authenticate as never, (req, res, next) => ticketsController.getMyTickets(req, res, next));
router.get('/assigned', authenticate as never, (req, res, next) => ticketsController.getAssignedTickets(req, res, next));
router.get('/stats', authenticate as never, (req, res, next) => ticketsController.getStats(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE_TICKET', 'ticket') as never, (req, res, next) => ticketsController.create(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => ticketsController.findById(req, res, next));
router.post('/:id/messages', authenticate as never, (req, res, next) => ticketsController.addMessage(req, res, next));
router.post('/:id/assign', authenticate as never, auditLog('ASSIGN_TICKET', 'ticket') as never, (req, res, next) => ticketsController.assign(req, res, next));
router.post('/:id/escalate', authenticate as never, auditLog('ESCALATE_TICKET', 'ticket') as never, (req, res, next) => ticketsController.escalate(req, res, next));
router.post('/:id/resolve', authenticate as never, auditLog('RESOLVE_TICKET', 'ticket') as never, (req, res, next) => ticketsController.resolve(req, res, next));
router.post('/:id/close', authenticate as never, auditLog('CLOSE_TICKET', 'ticket') as never, (req, res, next) => ticketsController.close(req, res, next));
router.post('/:id/reopen', authenticate as never, auditLog('REOPEN_TICKET', 'ticket') as never, (req, res, next) => ticketsController.reopen(req, res, next));
router.put('/:id/priority', authenticate as never, auditLog('SET_PRIORITY', 'ticket') as never, (req, res, next) => ticketsController.setPriority(req, res, next));

export { router as ticketsRouter };