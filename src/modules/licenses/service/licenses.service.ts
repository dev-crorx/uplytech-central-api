import { Prisma, LicenseStatus, LicenseType } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';
import crypto from 'crypto';

const log = new ModuleLogger('LicensesService');

export class LicensesService {
  async findAll(params: PaginationParams, filters?: { status?: string; productId?: string }) {
    const where: Prisma.LicenseWhereInput = {};
    if (filters?.status) where.status = filters.status as LicenseStatus;
    if (filters?.productId) where.productId = filters.productId;
    const [data, total] = await Promise.all([
      prisma.license.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' },
        include: { product: { select: { id: true, name: true } }, user: { select: { id: true, username: true, email: true } } } }),
      prisma.license.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const license = await prisma.license.findUnique({ where: { id },
      include: { product: true, user: { select: { id: true, username: true, email: true } } } });
    if (!license) throw new NotFoundError('License');
    return license;
  }

  async generate(data: { productId: string; userId: string; type: string; maxActivations?: number; expiresAt?: string }, adminId: string) {
    const key = this.generateLicenseKey();
    const license = await prisma.license.create({
      data: { key, productId: data.productId, userId: data.userId, type: data.type as LicenseType, status: 'ACTIVE' as LicenseStatus as LicenseStatus,
        activations: data.maxActivations || 1, currentActivations: 0,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null },
    });
    await eventBus.emit('licenses.generated', { type: 'licenses.generated', source: 'licenses-service', data: { id: license.id }, userId: adminId });
    await createAuditEntry(adminId, 'LICENSE_GENERATED', 'license', license.id, { productId: data.productId, userId: data.userId } as object);
    log.info('License generated', { id: license.id, key });
    return license;
  }

  async validate(key: string) {
    const license = await prisma.license.findFirst({ where: { key }, include: { product: { select: { id: true, name: true, status: true } } } });
    if (!license) return { valid: false, reason: 'License key not found' };
    if (license.status !== 'ACTIVE') return { valid: false, reason: 'License is ' + license.status.toLowerCase() };
    if (license.expiresAt && new Date() > license.expiresAt) return { valid: false, reason: 'License has expired' };
    if (license.activations && license.currentActivations >= license.activations) return { valid: false, reason: 'Maximum activations reached' };
    return { valid: true, license: { id: license.id, type: license.type, product: license.product } };
  }

  async activate(key: string, deviceId: string, userId: string) {
    const license = await prisma.license.findFirst({ where: { key } });
    if (!license) throw new NotFoundError('License');
    if (license.status !== 'ACTIVE') throw new BadRequestError('License is not active');
    if (license.activations && license.currentActivations >= license.activations) throw new BadRequestError('Maximum activations reached');
    await prisma.license.update({ where: { id: license.id }, data: { currentActivations: { increment: 1 } } });
    await createAuditEntry(userId, 'LICENSE_ACTIVATED', 'license', license.id, { deviceId } as object);
    log.info('License activated', { key, deviceId });
    return { activated: true };
  }

  async deactivate(id: string, adminId: string) {
    await prisma.license.update({ where: { id }, data: { status: 'SUSPENDED' as LicenseStatus } });
    await createAuditEntry(adminId, 'LICENSE_DEACTIVATED', 'license', id);
  }

  async revoke(id: string, reason: string, adminId: string) {
    await prisma.license.update({ where: { id }, data: { status: 'REVOKED' as LicenseStatus as LicenseStatus } });
    await createAuditEntry(adminId, 'LICENSE_REVOKED', 'license', id, { reason } as object);
    log.warn('License revoked', { id, reason });
  }

  async renew(id: string, newExpiryDate: string, adminId: string) {
    const license = await prisma.license.findUnique({ where: { id } });
    if (!license) throw new NotFoundError('License');
    await prisma.license.update({ where: { id }, data: { expiresAt: new Date(newExpiryDate), status: 'ACTIVE' as LicenseStatus as LicenseStatus } });
    await createAuditEntry(adminId, 'LICENSE_RENEWED', 'license', id, { newExpiryDate } as object);
  }

  private generateLicenseKey(): string {
    const segments = [];
    for (let i = 0; i < 4; i++) {
      segments.push(crypto.randomBytes(3).toString('hex').toUpperCase());
    }
    return segments.join('-');
  }

  async getMyLicenses(userId: string) {
    return prisma.license.findMany({ where: { userId }, include: { product: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
  }
}

export const licensesService = new LicensesService();