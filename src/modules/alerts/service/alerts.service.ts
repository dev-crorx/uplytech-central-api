// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('AlertsService');

export class AlertsService {
  async findAll(params: PaginationParams, filters?: { severity?: string; status?: string; type?: string }) {
    const where: Prisma.AlertWhereInput = {};
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    const [data, total] = await Promise.all([
      prisma.alert.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }] }),
      prisma.alert.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async create(data: { type: string; severity: string; title: string; message: string; source: string; metadata?: object }) {
    const alert = await prisma.alert.create({ data: { type: data.type, severity: data.severity, title: data.title, message: data.message, source: data.source, metadata: data.metadata || null, status: 'ACTIVE' } });
    await eventBus.emit('alerts.created', { type: 'alerts.created', source: 'alerts-service', data: { id: alert.id, severity: data.severity } });
    log.warn('Alert created', { id: alert.id, severity: data.severity, type: data.type });
    return alert;
  }

  async acknowledge(id: string, userId: string) {
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundError('Alert');
    await prisma.alert.update({ where: { id }, data: { status: 'ACKNOWLEDGED', acknowledgedBy: userId, acknowledgedAt: new Date() } });
    await createAuditEntry(userId, 'ALERT_ACKNOWLEDGED', 'alert', id);
  }

  async resolve(id: string, userId: string, resolution: string) {
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundError('Alert');
    await prisma.alert.update({ where: { id }, data: { status: 'RESOLVED', resolvedBy: userId, resolvedAt: new Date(), resolution } });
    await createAuditEntry(userId, 'ALERT_RESOLVED', 'alert', id);
  }

  async dismiss(id: string, userId: string) {
    await prisma.alert.update({ where: { id }, data: { status: 'DISMISSED' } });
    await createAuditEntry(userId, 'ALERT_DISMISSED', 'alert', id);
  }

  async getActiveCount() {
    const [critical, high, medium, low] = await Promise.all([
      prisma.alert.count({ where: { status: 'ACTIVE', severity: 'CRITICAL' } }),
      prisma.alert.count({ where: { status: 'ACTIVE', severity: 'HIGH' } }),
      prisma.alert.count({ where: { status: 'ACTIVE', severity: 'MEDIUM' } }),
      prisma.alert.count({ where: { status: 'ACTIVE', severity: 'LOW' } }),
    ]);
    return { critical, high, medium, low, total: critical + high + medium + low };
  }
}

export const alertsService = new AlertsService();