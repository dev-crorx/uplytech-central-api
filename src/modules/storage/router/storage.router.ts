import { Router } from 'express';
import { storageController } from '../controller/storage.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => storageController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => storageController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => storageController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'storage') as never, (req, res, next) => storageController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'storage') as never, (req, res, next) => storageController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'storage') as never, (req, res, next) => storageController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'storage') as never, (req, res, next) => storageController.delete(req, res, next));

export { router as storageRouter };
