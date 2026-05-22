import { Router } from 'express';
import { teamsController } from '../controller/teams.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();
router.get('/', authenticate as never, (req, res, next) => teamsController.findAll(req, res, next));
router.get('/my', authenticate as never, (req, res, next) => teamsController.getMyTeams(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE_TEAM', 'team') as never, (req, res, next) => teamsController.create(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => teamsController.findById(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE_TEAM', 'team') as never, (req, res, next) => teamsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE_TEAM', 'team') as never, (req, res, next) => teamsController.delete(req, res, next));
router.post('/:id/members', authenticate as never, auditLog('ADD_MEMBER', 'team') as never, (req, res, next) => teamsController.addMember(req, res, next));
router.delete('/:id/members/:userId', authenticate as never, auditLog('REMOVE_MEMBER', 'team') as never, (req, res, next) => teamsController.removeMember(req, res, next));
router.put('/:id/members/:userId/role', authenticate as never, auditLog('UPDATE_MEMBER_ROLE', 'team') as never, (req, res, next) => teamsController.updateMemberRole(req, res, next));
router.post('/:id/transfer', authenticate as never, auditLog('TRANSFER_OWNERSHIP', 'team') as never, (req, res, next) => teamsController.transferOwnership(req, res, next));

export { router as teamsRouter };