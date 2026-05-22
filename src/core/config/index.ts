import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  apiPrefix: process.env.API_PREFIX || '/api',

  database: {
    url: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/uplytech_central',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/google/callback',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/github/callback',
    },
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@uplytech.com',
  },

  storage: {
    path: process.env.STORAGE_PATH || '/data/storage',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10),
  },

  streaming: {
    twitch: {
      clientId: process.env.TWITCH_CLIENT_ID || '',
      clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
    },
    youtube: {
      apiKey: process.env.YOUTUBE_API_KEY || '',
    },
    kick: {
      apiKey: process.env.KICK_API_KEY || '',
    },
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || 'default-32-byte-encryption-key!!',
    iv: process.env.ENCRYPTION_IV || 'default-16-byte!',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
} as const;

export type Config = typeof config;
