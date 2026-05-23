import crypto from 'crypto';
import { logger } from '../logger';

export class SecurityService {
  static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static validateCSRFToken(token: string, storedToken: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(storedToken)
    );
  }

  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  static detectSqlInjection(input: string): boolean {
    const patterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b)/i,
      /(--|#|\/\*)/,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
      /('.*--)/,
      /(;\s*(DROP|DELETE|UPDATE|INSERT))/i,
    ];
    return patterns.some((pattern) => pattern.test(input));
  }

  static detectXSS(input: string): boolean {
    const patterns = [
      /<script[\s>]/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
    ];
    return patterns.some((pattern) => pattern.test(input));
  }

  static hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const usedSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, usedSalt, 100000, 64, 'sha512').toString('hex');
    return { hash, salt: usedSalt };
  }

  static verifyPassword(password: string, hash: string, salt: string): boolean {
    const result = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(result), Buffer.from(hash));
  }

  static generateTOTPSecret(): string {
    return crypto.randomBytes(20).toString('hex');
  }

  static checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score++;
    else feedback.push('Password should be at least 8 characters');

    if (password.length >= 12) score++;
    if (password.length >= 16) score++;

    if (/[a-z]/.test(password)) score++;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Add uppercase letters');

    if (/\d/.test(password)) score++;
    else feedback.push('Add numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score++;
    else feedback.push('Add special characters');

    if (/(.)\1{2,}/.test(password)) {
      score--;
      feedback.push('Avoid repeated characters');
    }

    return { score: Math.max(0, Math.min(score, 7)), feedback };
  }

  static generateSessionFingerprint(userAgent: string, ip: string): string {
    return crypto
      .createHash('sha256')
      .update(`${userAgent}:${ip}`)
      .digest('hex');
  }

  static isDisposableEmail(email: string): boolean {
    const disposableDomains = [
      'tempmail.com', 'throwaway.email', 'guerrillamail.com',
      'mailinator.com', 'trashmail.com', 'yopmail.com',
    ];
    const domain = email.split('@')[1]?.toLowerCase();
    return disposableDomains.includes(domain);
  }

  static logSecurityEvent(event: string, details: Record<string, unknown>): void {
    logger.warn(`SECURITY EVENT: ${event}`, details);
  }
}
