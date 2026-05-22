// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('DevicesService');

export class DevicesService {
  async findAll(params: PaginationParams, filters?: { type?: string; status?: string; userId?: string }) {
    const where: Prisma.DeviceWhereInput = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.userId) where.userId = filters.userId;
    const [data, total] = await Promise.all([
      prisma.device.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { lastSeen: 'desc' },
        include: { user: { select: { id: true, username: true, displayName: true } } } }),
      prisma.device.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const device = await prisma.device.findUnique({ where: { id }, include: { user: { select: { id: true, username: true, displayName: true } } } });
    if (!device) throw new NotFoundError('Device');
    return device;
  }

  async register(data: { name: string; type: string; hostname?: string; os?: string; ip?: string; macAddress?: string; metadata?: object }, userId: string) {
    const device = await prisma.device.create({
      data: { name: data.name, type: data.type, hostname: data.hostname || null, os: data.os || null,
        ip: data.ip || null, macAddress: data.macAddress || null, metadata: data.metadata || null,
        userId, status: 'ONLINE', lastSeen: new Date() },
    });
    await eventBus.emit('devices.registered', { type: 'devices.registered', source: 'devices-service', data: { id: device.id, type: data.type }, userId });
    await createAuditEntry(userId, 'DEVICE_REGISTERED', 'device', device.id);
    log.info('Device registered', { id: device.id, name: data.name, type: data.type });
    return device;
  }

  async heartbeat(id: string, data?: { ip?: string; metadata?: object }) {
    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundError('Device');
    const updateData: Prisma.DeviceUpdateInput = { lastSeen: new Date(), status: 'ONLINE' };
    if (data?.ip) updateData.ip = data.ip;
    if (data?.metadata) updateData.metadata = data.metadata as object;
    return prisma.device.update({ where: { id }, data: updateData });
  }

  async deregister(id: string, userId: string) {
    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundError('Device');
    await prisma.device.delete({ where: { id } });
    await createAuditEntry(userId, 'DEVICE_DEREGISTERED', 'device', id);
    log.info('Device deregistered', { id });
  }

  async update(id: string, data: Prisma.DeviceUpdateInput, userId: string) {
    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundError('Device');
    const updated = await prisma.device.update({ where: { id }, data });
    await createAuditEntry(userId, 'DEVICE_UPDATED', 'device', id);
    return updated;
  }

  async getMyDevices(userId: string) {
    return prisma.device.findMany({ where: { userId }, orderBy: { lastSeen: 'desc' } });
  }

  async setStatus(id: string, status: string, userId: string) {
    await prisma.device.update({ where: { id }, data: { status } });
    await createAuditEntry(userId, 'DEVICE_STATUS_CHANGED', 'device', id, { status } as object);
  }
}

export const devicesService = new DevicesService();