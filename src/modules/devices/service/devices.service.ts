import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('DevicesService');

export class DevicesService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.DeviceWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.device.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.DeviceOrderByWithRelationInput,
        
      }),
      prisma.device.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.device.findUnique({
      where: { id },
      
    });

    if (!record) {
      throw new NotFoundError('Device');
    }

    return record;
  }

  async create(data: Prisma.DeviceCreateInput, userId?: string) {
    
    
    

    const record = await prisma.device.create({ data });

    await eventBus.emit('devices.created', {
      type: 'devices.created',
      source: 'devices-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'devices', record.id);

    log.info('Device created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.DeviceUpdateInput, userId?: string) {
    const existing = await prisma.device.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Device');
    }

    const record = await prisma.device.update({
      where: { id },
      data,
    });

    await eventBus.emit('devices.updated', {
      type: 'devices.updated',
      source: 'devices-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'devices', id);

    log.info('Device updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.device.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Device');
    }

    await prisma.device.delete({ where: { id } });

    await eventBus.emit('devices.deleted', {
      type: 'devices.deleted',
      source: 'devices-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'devices', id);

    log.info('Device deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.DeviceWhereInput = {
      name: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.device.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.device.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const devicesService = new DevicesService();
