import { Prisma, AlertType, AlertSeverity } from '@prisma/client';
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
    if (filters?.severity) where.severity = filters.severity as AlertSeverity;
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type as AlertType;
    const [data, total] = await Promise.all([
      prisma.alert.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }] }),
      prisma.alert.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async create(data: { type: string; severity: string; title: string; message: string; source: string; metadata?: object }) {
    const alert = await prisma.alert.create({ data: { type: data.type as AlertType, severity: data.severity as AlertSeverity, title: data.title, message: data.message, source: data.source, metadata: data.metadata || undefined, status: 'ACTIVE' } });
    await eventBus.emit('alerts.created', { type: 'alerts.created', source: 'alerts-service', data: { id: alert.id, severity: data.severity } });
    log.warn('Alert created', { id: alert.id, severity: data.severity, type: data.type });
    return alert;
  }

  async acknowledge(id: string, userId: string) {
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundError('Alert');
    await prisma.alert.update({ where: { id }, data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() } });
    await createAuditEntry(userId, 'ALERT_ACKNOWLEDGED', 'alert', id);
  }

  async resolve(id: string, userId: string, resolution: string) {
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundError('Alert');
    await prisma.alert.update({ where: { id }, data: { status: 'RESOLVED', resolvedAt: new Date(), resolution } });
    await createAuditEntry(userId, 'ALERT_RESOLVED', 'alert', id);
  }

  async dismiss(id: string, userId: string) {
    await prisma.alert.update({ where: { id }, data: { status: 'DISMISSED' } });
    await createAuditEntry(userId, 'ALERT_DISMISSED', 'alert', id);
  }

  async getActiveCount() {
    const [critical, high, medium, low] = await Promise.all([
      prisma.alert.count({ where: { status: 'ACTIVE', severity: 'CRITICAL' } }),
      prisma.alert.count({ where: { status: 'ACTIVE', severity: 'CRITICAL' as AlertSeverity } }),
      prisma.alert.count({ where: { status: 'ACTIVE', severity: 'WARNING' as AlertSeverity } }),
      prisma.alert.count({ where: { status: 'ACTIVE', severity: 'INFO' as AlertSeverity } }),
    ]);
    return { critical, high, medium, low, total: critical + high + medium + low };
  }
}

export const alertsService = new AlertsService();