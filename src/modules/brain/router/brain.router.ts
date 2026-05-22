import { Router } from 'express';
import { brainController } from '../controller/brain.controller';
import { authenticate, requireRole } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.post('/query', authenticate as never, auditLog('QUERY', 'brain') as never, (req, res, next) => brainController.query(req as never, res, next));
router.post('/teach', authenticate as never, requireRole('ADMIN', 'SUPER_ADMIN') as never, auditLog('TEACH', 'brain') as never, (req, res, next) => brainController.teach(req as never, res, next));
router.post('/memorize', authenticate as never, requireRole('ADMIN', 'SUPER_ADMIN') as never, auditLog('MEMORIZE', 'brain') as never, (req, res, next) => brainController.memorize(req as never, res, next));
router.post('/forget', authenticate as never, requireRole('ADMIN', 'SUPER_ADMIN') as never, auditLog('FORGET', 'brain') as never, (req, res, next) => brainController.forget(req as never, res, next));
router.post('/feedback', authenticate as never, auditLog('FEEDBACK', 'brain') as never, (req, res, next) => brainController.feedback(req as never, res, next));
router.post('/train', authenticate as never, requireRole('ADMIN', 'SUPER_ADMIN') as never, auditLog('TRAIN', 'brain') as never, (req, res, next) => brainController.train(req as never, res, next));
router.post('/training-data', authenticate as never, requireRole('ADMIN', 'SUPER_ADMIN') as never, auditLog('ADD_TRAINING_DATA', 'brain') as never, (req, res, next) => brainController.addTrainingData(req as never, res, next));
router.patch('/training-data/:id/validate', authenticate as never, requireRole('ADMIN', 'SUPER_ADMIN') as never, auditLog('VALIDATE_TRAINING_DATA', 'brain') as never, (req, res, next) => brainController.validateTrainingData(req as never, res, next));
router.get('/training-data', authenticate as never, (req, res, next) => brainController.getTrainingData(req as never, res, next));
router.get('/memories', authenticate as never, (req, res, next) => brainController.getMemories(req as never, res, next));
router.get('/patterns', authenticate as never, (req, res, next) => brainController.getPatterns(req as never, res, next));
router.get('/interactions', authenticate as never, (req, res, next) => brainController.getInteractions(req as never, res, next));
router.get('/stats', authenticate as never, (req, res, next) => brainController.getStats(req as never, res, next));

export { router as brainRouter };
