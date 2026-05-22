import { Request, Response, NextFunction } from 'express';
import { productsService } from '../service/products.service';
import { parsePagination } from '../../../core/utils';

export class ProductsController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); const f = { status: req.query.status ? String(req.query.status) : undefined, categoryId: req.query.categoryId ? String(req.query.categoryId) : undefined, minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined, maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined }; res.json({ success: true, ...await productsService.findAll(p, f) }); } catch (e) { next(e); }
  }
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await productsService.findById(String(req.params.id)) }); } catch (e) { next(e); }
  }
  async findBySku(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await productsService.findBySku(String(req.params.sku)) }); } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.status(201).json({ success: true, data: await productsService.create(req.body, uid) }); } catch (e) { next(e); }
  }
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await productsService.update(String(req.params.id), req.body, uid) }); } catch (e) { next(e); }
  }
  async updateStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await productsService.updateStock(String(req.params.id), Number(req.body.quantity), req.body.operation || 'SET', uid) }); } catch (e) { next(e); }
  }
  async updatePrice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; res.json({ success: true, data: await productsService.updatePrice(String(req.params.id), Number(req.body.price), uid) }); } catch (e) { next(e); }
  }
  async activate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await productsService.activate(String(req.params.id), uid); res.json({ success: true, message: 'Product activated' }); } catch (e) { next(e); }
  }
  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await productsService.deactivate(String(req.params.id), uid); res.json({ success: true, message: 'Product deactivated' }); } catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const uid = (req as unknown as { user: { id: string } }).user.id; await productsService.delete(String(req.params.id), uid); res.json({ success: true, message: 'Product deleted' }); } catch (e) { next(e); }
  }
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const p = parsePagination(req.query as Record<string, unknown>); res.json({ success: true, ...await productsService.search(String(req.query.q || ''), p) }); } catch (e) { next(e); }
  }
  async getLowStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await productsService.getLowStock(Number(req.query.threshold || 10)) }); } catch (e) { next(e); }
  }
}
export const productsController = new ProductsController();