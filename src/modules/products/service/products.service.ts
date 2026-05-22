import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse, slugify } from '../../../core/utils';

const log = new ModuleLogger('ProductsService');

export class ProductsService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.ProductWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.ProductOrderByWithRelationInput,
        
      }),
      prisma.product.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.product.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Product');
    }

    return record;
  }

  async create(data: Prisma.ProductCreateInput, userId?: string) {
    const nameOrTitle = (data as Record<string, unknown>).name || (data as Record<string, unknown>).title || '';
    const slug = slugify(String(nameOrTitle));
    (data as Record<string, unknown>).slug = slug;
    
    

    const record = await prisma.product.create({ data });

    await eventBus.emit('products.created', {
      type: 'products.created',
      source: 'products-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'products', record.id);

    log.info('Product created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.ProductUpdateInput, userId?: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Product');
    }

    const record = await prisma.product.update({
      where: { id },
      data,
    });

    await eventBus.emit('products.updated', {
      type: 'products.updated',
      source: 'products-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'products', id);

    log.info('Product updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Product');
    }

    await prisma.product.delete({ where: { id } });

    await eventBus.emit('products.deleted', {
      type: 'products.deleted',
      source: 'products-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'products', id);

    log.info('Product deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.ProductWhereInput = {
      name: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const productsService = new ProductsService();
