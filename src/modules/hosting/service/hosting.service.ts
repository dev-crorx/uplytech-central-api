import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('HostingService');

export class HostingService {
  async findAll(params: PaginationParams, filters?: { status?: string; type?: string; userId?: string }) {
    const where: Prisma.HostingInstanceWhereInput = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.userId) where.userId = filters.userId;
    const [data, total] = await Promise.all([
      prisma.hostingInstance.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' },
         }),
      prisma.hostingInstance.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const instance = await prisma.hostingInstance.findUnique({ where: { id },
       });
    if (!instance) throw new NotFoundError('Hosting instance');
    return instance;
  }

  async provision(data: { name: string; type: string; plan: string; region?: string; config?: object }, userId: string) {
    const instance = await prisma.hostingInstance.create({
      data: { name: data.name, type: data.type, provider: 'docker', plan: data.plan, region: data.region || 'eu-central-1',
        config: data.config || undefined, userId, status: 'provisioning', containerId: 'container-' + Date.now() },
    });
    await eventBus.emit('hosting.provisioned', { type: 'hosting.provisioned', source: 'hosting-service', data: { id: instance.id, type: data.type }, userId });
    await createAuditEntry(userId, 'INSTANCE_PROVISIONED', 'hosting', instance.id, { type: data.type, plan: data.plan } as object);
    log.info('Instance provisioned', { id: instance.id, type: data.type });
    setTimeout(async () => {
      await prisma.hostingInstance.update({ where: { id: instance.id }, data: { status: 'RUNNING', startedAt: new Date() } });
    }, 5000);
    return instance;
  }

  async start(id: string, userId: string) {
    const instance = await prisma.hostingInstance.findUnique({ where: { id } });
    if (!instance) throw new NotFoundError('Hosting instance');
    if (instance.status === 'RUNNING') throw new BadRequestError('Instance is already running');
    await prisma.hostingInstance.update({ where: { id }, data: { status: 'RUNNING', startedAt: new Date() } });
    await eventBus.emit('hosting.started', { type: 'hosting.started', source: 'hosting-service', data: { id }, userId });
    await createAuditEntry(userId, 'INSTANCE_STARTED', 'hosting', id);
  }

  async stop(id: string, userId: string) {
    const instance = await prisma.hostingInstance.findUnique({ where: { id } });
    if (!instance) throw new NotFoundError('Hosting instance');
    if (instance.status === 'STOPPED') throw new BadRequestError('Instance is already stopped');
    await prisma.hostingInstance.update({ where: { id }, data: { status: 'STOPPED', stoppedAt: new Date() } });
    await eventBus.emit('hosting.stopped', { type: 'hosting.stopped', source: 'hosting-service', data: { id }, userId });
    await createAuditEntry(userId, 'INSTANCE_STOPPED', 'hosting', id);
  }

  async restart(id: string, userId: string) {
    await this.stop(id, userId);
    await this.start(id, userId);
    await createAuditEntry(userId, 'INSTANCE_RESTARTED', 'hosting', id);
  }

  async delete(id: string, userId: string) {
    const instance = await prisma.hostingInstance.findUnique({ where: { id } });
    if (!instance) throw new NotFoundError('Hosting instance');
    await prisma.hostingInstance.delete({ where: { id } });
    await eventBus.emit('hosting.deleted', { type: 'hosting.deleted', source: 'hosting-service', data: { id }, userId });
    await createAuditEntry(userId, 'INSTANCE_DELETED', 'hosting', id);
    log.info('Instance deleted', { id });
  }

  async getLogs(id: string, lines: number) {
    const instance = await prisma.hostingInstance.findUnique({ where: { id } });
    if (!instance) throw new NotFoundError('Hosting instance');
    return { instanceId: id, logs: '[Container logs would come from Docker API]', lines };
  }

  async getMetrics(id: string) {
    const instance = await prisma.hostingInstance.findUnique({ where: { id } });
    if (!instance) throw new NotFoundError('Hosting instance');
    return { instanceId: id, cpu: Math.random() * 100, memory: Math.random() * 100, disk: Math.random() * 100,
      network: { in: Math.floor(Math.random() * 1000000), out: Math.floor(Math.random() * 500000) },
      uptime: instance.startedAt ? Date.now() - instance.startedAt.getTime() : 0 };
  }

  async updateConfig(id: string, config: object, userId: string) {
    const instance = await prisma.hostingInstance.findUnique({ where: { id } });
    if (!instance) throw new NotFoundError('Hosting instance');
    await prisma.hostingInstance.update({ where: { id }, data: { config: config as Prisma.InputJsonValue } });
    await createAuditEntry(userId, 'INSTANCE_CONFIG_UPDATED', 'hosting', id);
  }

  async getMyInstances(userId: string) {
    return prisma.hostingInstance.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
}

export const hostingService = new HostingService();