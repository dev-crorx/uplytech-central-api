import { Router } from 'express';
import { auditController } from '../controller/audit.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => auditController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => auditController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => auditController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'audit') as never, (req, res, next) => auditController.create(req, res, next));


export { router as auditRouter };
