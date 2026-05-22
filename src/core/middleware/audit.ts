import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../database';
import { logger } from '../logger';

export function auditLog(action: string, resource: string) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    const originalJson = _res.json.bind(_res);

    _res.json = function (body: unknown) {
      const statusCode = _res.statusCode;

      setImmediate(async () => {
        try {
          await prisma.auditLog.create({
            data: {
              userId: req.user?.id || null,
              action,
              resource,
              resourceId: String(req.params.id || '') || null,
              ipAddress: String(req.ip || '') || null,
              userAgent: req.headers['user-agent'] || null,
              metadata: {
                method: req.method,
                path: req.path,
                statusCode,
              },
            },
          });
        } catch (error) {
          logger.error('Failed to create audit log', { error, action, resource });
        }
      });

      return originalJson(body);
    };

    next();
  };
}

export async function createAuditEntry(
  userId: string | null,
  action: string,
  resource: string,
  resourceId: string | null,
  metadata?: object,
  oldValues?: object,
  newValues?: object
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        oldValues: oldValues || undefined,
        newValues: newValues || undefined,
        metadata: metadata || undefined,
      },
    });
  } catch (error) {
    logger.error('Failed to create audit entry', { error });
  }
}
