import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    code: 'TOO_MANY_REQUESTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    code: 'TOO_MANY_AUTH_ATTEMPTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiKeyRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'API rate limit exceeded',
    code: 'API_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export function createCustomRateLimiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}
