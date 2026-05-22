import crypto from 'crypto';
import { config } from '../config';
import { PaginationParams, PaginatedResponse } from '../types';

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = 'uply_' + crypto.randomBytes(4).toString('hex');
  const secret = crypto.randomBytes(32).toString('hex');
  const key = `${prefix}_${secret}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(config.encryption.key.padEnd(32).slice(0, 32)),
    Buffer.from(config.encryption.iv.padEnd(16).slice(0, 16))
  );
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decrypt(encrypted: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(config.encryption.key.padEnd(32).slice(0, 32)),
    Buffer.from(config.encryption.iv.padEnd(16).slice(0, 16))
  );
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const get = (key: string): string | undefined => {
    const val = query[key];
    if (Array.isArray(val)) return String(val[0]);
    if (val !== undefined && val !== null) return String(val);
    return undefined;
  };

  return {
    page: Math.max(1, parseInt(get('page') || '1', 10)),
    limit: Math.min(100, Math.max(1, parseInt(get('limit') || '20', 10))),
    sortBy: get('sortBy'),
    sortOrder: (get('sortOrder') as 'asc' | 'desc') || 'desc',
  };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrevious: params.page > 1,
    },
  };
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `INV-${year}-${random}`;
}

export function generateLicenseKey(): string {
  const segments = Array.from({ length: 4 }, () =>
    crypto.randomBytes(2).toString('hex').toUpperCase()
  );
  return segments.join('-');
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

export function maskIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***.`;
  }
  return '***';
}
