import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { config } from '../../../core/config';
import { prisma } from '../../../core/database';
import { eventBus, EventTypes } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../../../core/errors';
import { generateToken, generateApiKey } from '../../../core/utils';
import { SecurityService } from '../../../core/security';
import { createAuditEntry } from '../../../core/middleware/audit';

const log = new ModuleLogger('AuthService');

interface RegisterInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

interface LoginInput {
  login: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthResult {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
  tokens: TokenPair;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    const { email, username, password, displayName } = input;

    if (SecurityService.isDisposableEmail(email)) {
      throw new BadRequestError('Disposable email addresses are not allowed');
    }

    const strengthCheck = SecurityService.checkPasswordStrength(password);
    if (strengthCheck.score < 4) {
      throw new BadRequestError('Password too weak', {
        feedback: strengthCheck.feedback as unknown as string,
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictError('Email already registered');
      }
      throw new ConflictError('Username already taken');
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        displayName: displayName || username,
        status: 'ACTIVE',
      },
    });

    const defaultRole = await prisma.role.findUnique({
      where: { name: 'USER' },
    });

    if (defaultRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: defaultRole.id,
        },
      });
    }

    const tokens = this.generateTokenPair(user.id, user.email, user.username);

    await eventBus.emit(EventTypes.AUTH.REGISTER, {
      type: EventTypes.AUTH.REGISTER,
      source: 'auth-service',
      data: { userId: user.id, email: user.email },
      userId: user.id,
    });

    await createAuditEntry(user.id, 'REGISTER', 'user', user.id, { email });

    log.info('User registered', { userId: user.id, email });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
      },
      tokens,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const { login, password, ipAddress, userAgent } = input;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: login }, { username: login }],
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.status === 'BANNED') {
      throw new UnauthorizedError('Account has been banned');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedError('Account has been suspended');
    }

    const validPassword = await argon2.verify(user.passwordHash, password);
    if (!validPassword) {
      SecurityService.logSecurityEvent('FAILED_LOGIN', {
        userId: user.id,
        email: user.email,
        ip: ipAddress,
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    const tokens = this.generateTokenPair(user.id, user.email, user.username);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: tokens.accessToken.substring(0, 255),
        refreshToken: tokens.refreshToken,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress || null,
      },
    });

    await eventBus.emit(EventTypes.AUTH.LOGIN, {
      type: EventTypes.AUTH.LOGIN,
      source: 'auth-service',
      data: { userId: user.id, ipAddress },
      userId: user.id,
    });

    await createAuditEntry(user.id, 'LOGIN', 'session', null, { ipAddress });

    log.info('User logged in', { userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
      },
      tokens,
    };
  }

  async logout(userId: string, token: string): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        userId,
        token: token.substring(0, 255),
      },
    });

    await eventBus.emit(EventTypes.AUTH.LOGOUT, {
      type: EventTypes.AUTH.LOGOUT,
      source: 'auth-service',
      data: { userId },
      userId,
    });

    await createAuditEntry(userId, 'LOGOUT', 'session', null);

    log.info('User logged out', { userId });
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User account is not active');
    }

    const tokens = this.generateTokenPair(
      session.user.id,
      session.user.email,
      session.user.username
    );

    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: tokens.accessToken.substring(0, 255),
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await eventBus.emit(EventTypes.AUTH.TOKEN_REFRESH, {
      type: EventTypes.AUTH.TOKEN_REFRESH,
      source: 'auth-service',
      data: { userId: session.userId },
      userId: session.userId,
    });

    return tokens;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.passwordHash) {
      throw new NotFoundError('User');
    }

    const validPassword = await argon2.verify(user.passwordHash, currentPassword);
    if (!validPassword) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const strengthCheck = SecurityService.checkPasswordStrength(newPassword);
    if (strengthCheck.score < 4) {
      throw new BadRequestError('New password too weak', {
        feedback: strengthCheck.feedback as unknown as string,
      });
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await prisma.session.deleteMany({ where: { userId } });

    await eventBus.emit(EventTypes.AUTH.PASSWORD_RESET, {
      type: EventTypes.AUTH.PASSWORD_RESET,
      source: 'auth-service',
      data: { userId },
      userId,
    });

    await createAuditEntry(userId, 'PASSWORD_CHANGED', 'user', userId);

    log.info('Password changed', { userId });
  }

  async createApiKey(
    userId: string,
    name: string,
    scopes: string[],
    expiresIn?: number,
    isBeta = false
  ): Promise<{ apiKey: string; id: string }> {
    const { key, prefix, hash } = generateApiKey();

    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash: hash,
        prefix,
        scopes,
        isBeta,
        expiresAt: expiresIn
          ? new Date(Date.now() + expiresIn * 1000)
          : null,
      },
    });

    await eventBus.emit(EventTypes.AUTH.API_KEY_CREATED, {
      type: EventTypes.AUTH.API_KEY_CREATED,
      source: 'auth-service',
      data: { userId, apiKeyId: apiKeyRecord.id, name, isBeta },
      userId,
    });

    await createAuditEntry(userId, 'API_KEY_CREATED', 'api_key', apiKeyRecord.id, {
      name,
      scopes,
      isBeta,
    });

    log.info('API key created', { userId, apiKeyId: apiKeyRecord.id });

    return { apiKey: key, id: apiKeyRecord.id };
  }

  async revokeApiKey(userId: string, apiKeyId: string): Promise<void> {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundError('API key');
    }

    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { status: 'REVOKED' },
    });

    await createAuditEntry(userId, 'API_KEY_REVOKED', 'api_key', apiKeyId);

    log.info('API key revoked', { userId, apiKeyId });
  }

  async listApiKeys(userId: string) {
    return prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        status: true,
        isBeta: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });

    await createAuditEntry(userId, 'SESSION_REVOKED', 'session', sessionId);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await prisma.session.deleteMany({ where: { userId } });
    await createAuditEntry(userId, 'ALL_SESSIONS_REVOKED', 'session', null);
  }

  async handleOAuthLogin(
    provider: string,
    providerId: string,
    profile: {
      email: string;
      displayName?: string;
      avatar?: string;
    },
    ipAddress?: string
  ): Promise<AuthResult> {
    const oauthAccount = await prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: { user: true },
    });

    if (oauthAccount) {
      const tokens = this.generateTokenPair(
        oauthAccount.user.id,
        oauthAccount.user.email,
        oauthAccount.user.username
      );

      await prisma.user.update({
        where: { id: oauthAccount.user.id },
        data: { lastLoginAt: new Date(), lastLoginIp: ipAddress || null },
      });

      return {
        user: {
          id: oauthAccount.user.id,
          email: oauthAccount.user.email,
          username: oauthAccount.user.username,
          displayName: oauthAccount.user.displayName,
          avatar: oauthAccount.user.avatar,
        },
        tokens,
      };
    }

    let user = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      const username = profile.email.split('@')[0] + '_' + generateToken(4);
      user = await prisma.user.create({
        data: {
          email: profile.email,
          username,
          displayName: profile.displayName || username,
          avatar: profile.avatar || null,
          emailVerified: true,
          status: 'ACTIVE',
        },
      });

      const defaultRole = await prisma.role.findUnique({
        where: { name: 'USER' },
      });
      if (defaultRole) {
        await prisma.userRole.create({
          data: { userId: user.id, roleId: defaultRole.id },
        });
      }
    }

    await prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider,
        providerId,
        profile: profile as object,
      },
    });

    const tokens = this.generateTokenPair(user.id, user.email, user.username);

    await createAuditEntry(user.id, 'OAUTH_LOGIN', 'user', user.id, {
      provider,
      ipAddress,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
      },
      tokens,
    };
  }

  async registerPasskey(
    userId: string,
    credentialId: string,
    publicKey: string,
    name?: string
  ): Promise<void> {
    await prisma.passkey.create({
      data: {
        userId,
        credentialId,
        publicKey,
        name: name || 'Default Passkey',
      },
    });

    await eventBus.emit(EventTypes.AUTH.PASSKEY_REGISTERED, {
      type: EventTypes.AUTH.PASSKEY_REGISTERED,
      source: 'auth-service',
      data: { userId },
      userId,
    });

    await createAuditEntry(userId, 'PASSKEY_REGISTERED', 'passkey', null);

    log.info('Passkey registered', { userId });
  }

  async listPasskeys(userId: string) {
    return prisma.passkey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        deviceType: true,
        backedUp: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  async deletePasskey(userId: string, passkeyId: string): Promise<void> {
    await prisma.passkey.deleteMany({
      where: { id: passkeyId, userId },
    });
    await createAuditEntry(userId, 'PASSKEY_DELETED', 'passkey', passkeyId);
  }

  async enableTwoFactor(userId: string): Promise<{ secret: string }> {
    const secret = SecurityService.generateTOTPSecret();

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      },
    });

    await eventBus.emit(EventTypes.AUTH.TWO_FACTOR_ENABLED, {
      type: EventTypes.AUTH.TWO_FACTOR_ENABLED,
      source: 'auth-service',
      data: { userId },
      userId,
    });

    await createAuditEntry(userId, '2FA_ENABLED', 'user', userId);

    return { secret };
  }

  async disableTwoFactor(userId: string, password: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.passwordHash) {
      throw new NotFoundError('User');
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedError('Invalid password');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    await createAuditEntry(userId, '2FA_DISABLED', 'user', userId);
  }

  private generateTokenPair(
    userId: string,
    email: string,
    username: string
  ): TokenPair {
    const accessToken = jwt.sign(
      { userId, email, username },
      config.jwt.secret as jwt.Secret,
      { expiresIn: config.jwt.expiresIn as unknown as number }
    );

    const refreshToken = generateToken(64);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }
}

export const authService = new AuthService();
