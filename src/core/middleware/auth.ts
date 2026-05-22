import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../database';
import { UnauthorizedError, ForbiddenError } from '../errors';
import { AuthenticatedRequest } from '../types';
import { hashApiKey } from '../utils';

interface JwtPayload {
  userId: string;
  email: string;
  username: string;
}

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

    if (apiKeyHeader) {
      await authenticateApiKey(req, apiKeyHeader);
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User account is not active');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = user.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`)
    );

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      roles,
      permissions: [...new Set(permissions)],
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(new UnauthorizedError('Authentication failed'));
    }
  }
}

async function authenticateApiKey(
  req: AuthenticatedRequest,
  apiKey: string
): Promise<void> {
  const keyHash = hashApiKey(apiKey);

  const key = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!key || key.status !== 'ACTIVE') {
    throw new UnauthorizedError('Invalid API key');
  }

  if (key.expiresAt && key.expiresAt < new Date()) {
    throw new UnauthorizedError('API key expired');
  }

  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  const scopes = key.scopes as string[];

  req.apiKey = {
    id: key.id,
    userId: key.userId,
    scopes,
    isBeta: key.isBeta,
  };

  req.user = {
    id: key.user.id,
    email: key.user.email,
    username: key.user.username,
    roles: [],
    permissions: scopes,
  };
}

export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

  if (!authHeader && !apiKeyHeader) {
    return next();
  }

  authenticate(req, _res, next);
}

export function requirePermission(...requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (req.user.roles.includes('SUPER_ADMIN')) {
      return next();
    }

    const hasPermission = requiredPermissions.every((perm) =>
      req.user!.permissions.includes(perm)
    );

    if (!hasPermission) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

export function requireRole(...requiredRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const hasRole = requiredRoles.some((role) => req.user!.roles.includes(role));

    if (!hasRole) {
      return next(new ForbiddenError('Insufficient role'));
    }

    next();
  };
}
