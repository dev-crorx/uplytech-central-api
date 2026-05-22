import { Router } from 'express';
import { productsController } from '../controller/products.controller';
import { authenticate } from '../../../core/middleware/auth';
import { auditLog } from '../../../core/middleware/audit';

const router = Router();

router.get('/', authenticate as never, (req, res, next) => productsController.findAll(req, res, next));
router.get('/search', authenticate as never, (req, res, next) => productsController.search(req, res, next));
router.get('/:id', authenticate as never, (req, res, next) => productsController.findById(req, res, next));
router.post('/', authenticate as never, auditLog('CREATE', 'products') as never, (req, res, next) => productsController.create(req, res, next));
router.put('/:id', authenticate as never, auditLog('UPDATE', 'products') as never, (req, res, next) => productsController.update(req, res, next));
router.patch('/:id', authenticate as never, auditLog('UPDATE', 'products') as never, (req, res, next) => productsController.update(req, res, next));
router.delete('/:id', authenticate as never, auditLog('DELETE', 'products') as never, (req, res, next) => productsController.delete(req, res, next));

export { router as productsRouter };
