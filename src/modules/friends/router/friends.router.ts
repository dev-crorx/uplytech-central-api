import { Router } from 'express';
import { friendsController } from '../controller/friends.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => friendsController.getFriends(req, res, next));
router.get('/requests/pending', authenticate as never, (req, res, next) => friendsController.getPendingRequests(req, res, next));
router.get('/requests/sent', authenticate as never, (req, res, next) => friendsController.getSentRequests(req, res, next));
router.post('/requests', authenticate as never, auditLog('SEND_FRIEND_REQUEST', 'friend') as never, (req, res, next) => friendsController.sendRequest(req, res, next));
router.post('/requests/:id/accept', authenticate as never, auditLog('ACCEPT_FRIEND_REQUEST', 'friend') as never, (req, res, next) => friendsController.acceptRequest(req, res, next));
router.post('/requests/:id/reject', authenticate as never, (req, res, next) => friendsController.rejectRequest(req, res, next));
router.get('/mutual/:id', authenticate as never, (req, res, next) => friendsController.getMutualFriends(req, res, next));
router.delete('/:id', authenticate as never, auditLog('REMOVE_FRIEND', 'friend') as never, (req, res, next) => friendsController.removeFriend(req, res, next));
router.post('/:id/block', authenticate as never, auditLog('BLOCK_USER', 'friend') as never, (req, res, next) => friendsController.blockUser(req, res, next));

export { router as friendsRouter };