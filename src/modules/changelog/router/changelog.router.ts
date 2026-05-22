import { Router } from 'express';
import { changelogController } from '../controller/changelog.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => changelogController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => changelogController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => changelogController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'changelog') as never, (req, res, next) => changelogController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'changelog') as never, (req, res, next) => changelogController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'changelog') as never, (req, res, next) => changelogController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'changelog') as never, (req, res, next) => changelogController.delete(req, res, next));

export { router as changelogRouter };
