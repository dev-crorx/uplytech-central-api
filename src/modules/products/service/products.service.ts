// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ProductsService');

export class ProductsService {
  async findAll(params: PaginationParams, filters?: { status?: string; categoryId?: string; minPrice?: number; maxPrice?: number }) {
    const where: Prisma.ProductWhereInput = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.minPrice || filters?.maxPrice) {
      where.price = {};
      if (filters.minPrice) where.price.gte = filters.minPrice;
      if (filters.maxPrice) where.price.lte = filters.maxPrice;
    }
    const [data, total] = await Promise.all([
      prisma.product.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.product.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const product = await prisma.product.findUnique({ where: { id }, include: { licenses: { select: { id: true, key: true, status: true } } } });
    if (!product) throw new NotFoundError('Product');
    return product;
  }

  async findBySku(sku: string) {
    const product = await prisma.product.findFirst({ where: { sku } });
    if (!product) throw new NotFoundError('Product');
    return product;
  }

  async create(data: { name: string; description?: string; sku: string; price: number; currency?: string; type: string; categoryId?: string; images?: string; downloadUrl?: string; version?: string; stock?: number }, userId: string) {
    const existingSku = await prisma.product.findFirst({ where: { sku: data.sku } });
    if (existingSku) throw new BadRequestError('SKU already exists');
    const product = await prisma.product.create({
      data: { name: data.name, description: data.description || null, sku: data.sku, price: data.price, currency: data.currency || 'EUR',
        type: data.type, categoryId: data.categoryId || null, images: data.images || null, downloadUrl: data.downloadUrl || null,
        version: data.version || '1.0.0', stock: data.stock ?? null, status: 'ACTIVE' },
    });
    await eventBus.emit('products.created', { type: 'products.created', source: 'products-service', data: { id: product.id, sku: product.sku }, userId });
    await createAuditEntry(userId, 'PRODUCT_CREATED', 'product', product.id);
    log.info('Product created', { id: product.id, sku: product.sku });
    return product;
  }

  async update(id: string, data: Prisma.ProductUpdateInput, userId: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product');
    const updated = await prisma.product.update({ where: { id }, data });
    await createAuditEntry(userId, 'PRODUCT_UPDATED', 'product', id);
    return updated;
  }

  async updateStock(id: string, quantity: number, operation: 'SET' | 'ADD' | 'SUBTRACT', userId: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product');
    let newStock: number;
    if (operation === 'SET') newStock = quantity;
    else if (operation === 'ADD') newStock = (product.stock || 0) + quantity;
    else newStock = Math.max(0, (product.stock || 0) - quantity);
    const updated = await prisma.product.update({ where: { id }, data: { stock: newStock } });
    await eventBus.emit('products.stock_updated', { type: 'products.stock_updated', source: 'products-service', data: { id, stock: newStock, operation }, userId });
    await createAuditEntry(userId, 'STOCK_UPDATED', 'product', id, { quantity, operation, newStock } as object);
    return updated;
  }

  async updatePrice(id: string, price: number, userId: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product');
    const oldPrice = product.price;
    const updated = await prisma.product.update({ where: { id }, data: { price } });
    await createAuditEntry(userId, 'PRICE_UPDATED', 'product', id, { oldPrice: Number(oldPrice), newPrice: price } as object);
    return updated;
  }

  async activate(id: string, userId: string) {
    await prisma.product.update({ where: { id }, data: { status: 'ACTIVE' } });
    await createAuditEntry(userId, 'PRODUCT_ACTIVATED', 'product', id);
  }

  async deactivate(id: string, userId: string) {
    await prisma.product.update({ where: { id }, data: { status: 'INACTIVE' } });
    await createAuditEntry(userId, 'PRODUCT_DEACTIVATED', 'product', id);
  }

  async delete(id: string, userId: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product');
    await prisma.product.delete({ where: { id } });
    await createAuditEntry(userId, 'PRODUCT_DELETED', 'product', id);
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.ProductWhereInput = { status: 'ACTIVE', OR: [{ name: { contains: query } }, { description: { contains: query } }, { sku: { contains: query } }] };
    const [data, total] = await Promise.all([
      prisma.product.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.product.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getLowStock(threshold: number) {
    return prisma.product.findMany({ where: { stock: { lte: threshold, gt: 0 }, status: 'ACTIVE' }, orderBy: { stock: 'asc' } });
  }
}

export const productsService = new ProductsService();