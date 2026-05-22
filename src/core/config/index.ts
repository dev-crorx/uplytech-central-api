import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  apiPrefix: process.env.API_PREFIX || '/api',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',

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
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || '/api/v1/auth/oauth/google/callback',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackUrl: process.env.GITHUB_CALLBACK_URL || '/api/v1/auth/oauth/github/callback',
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
      callbackUrl: process.env.DISCORD_CALLBACK_URL || '/api/v1/auth/oauth/discord/callback',
    },
    twitter: {
      consumerKey: process.env.TWITTER_CONSUMER_KEY || '',
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET || '',
      callbackUrl: process.env.TWITTER_CALLBACK_URL || '/api/v1/auth/oauth/twitter/callback',
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
      callbackUrl: process.env.FACEBOOK_CALLBACK_URL || '/api/v1/auth/oauth/facebook/callback',
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID || '',
      teamId: process.env.APPLE_TEAM_ID || '',
      keyId: process.env.APPLE_KEY_ID || '',
      privateKey: process.env.APPLE_PRIVATE_KEY || '',
      callbackUrl: process.env.APPLE_CALLBACK_URL || '/api/v1/auth/oauth/apple/callback',
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      callbackUrl: process.env.MICROSOFT_CALLBACK_URL || '/api/v1/auth/oauth/microsoft/callback',
    },
    twitch: {
      clientId: process.env.TWITCH_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.TWITCH_OAUTH_CLIENT_SECRET || '',
      callbackUrl: process.env.TWITCH_CALLBACK_URL || '/api/v1/auth/oauth/twitch/callback',
    },
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID || '',
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
      callbackUrl: process.env.SPOTIFY_CALLBACK_URL || '/api/v1/auth/oauth/spotify/callback',
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      callbackUrl: process.env.LINKEDIN_CALLBACK_URL || '/api/v1/auth/oauth/linkedin/callback',
    },
    gitlab: {
      clientId: process.env.GITLAB_CLIENT_ID || '',
      clientSecret: process.env.GITLAB_CLIENT_SECRET || '',
      callbackUrl: process.env.GITLAB_CALLBACK_URL || '/api/v1/auth/oauth/gitlab/callback',
    },
    slack: {
      clientId: process.env.SLACK_CLIENT_ID || '',
      clientSecret: process.env.SLACK_CLIENT_SECRET || '',
      callbackUrl: process.env.SLACK_CALLBACK_URL || '/api/v1/auth/oauth/slack/callback',
    },
    steam: {
      apiKey: process.env.STEAM_API_KEY || '',
      callbackUrl: process.env.STEAM_CALLBACK_URL || '/api/v1/auth/oauth/steam/callback',
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
    tiktok: {
      clientKey: process.env.TIKTOK_CLIENT_KEY || '',
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
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
