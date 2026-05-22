import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './core/config';
import { errorHandler, globalRateLimiter } from './core/middleware';
import { logger } from './core/logger';

// Module Routers
import { authRouter } from './modules/auth/router/auth.router';
import { usersRouter } from './modules/users/router/users.router';
import { rolesRouter } from './modules/roles/router/roles.router';
import { permissionsRouter } from './modules/permissions/router/permissions.router';
import { teamsRouter } from './modules/teams/router/teams.router';
import { groupsRouter } from './modules/groups/router/groups.router';
import { apartmentsRouter } from './modules/apartments/router/apartments.router';
import { areasRouter } from './modules/areas/router/areas.router';
import { blogRouter } from './modules/blog/router/blog.router';
import { commentsRouter } from './modules/comments/router/comments.router';
import { reactionsRouter } from './modules/reactions/router/reactions.router';
import { ticketsRouter } from './modules/tickets/router/tickets.router';
import { friendsRouter } from './modules/friends/router/friends.router';
import { productsRouter } from './modules/products/router/products.router';
import { licensesRouter } from './modules/licenses/router/licenses.router';
import { devicesRouter } from './modules/devices/router/devices.router';
import { analyticsRouter } from './modules/analytics/router/analytics.router';
import { metricsRouter } from './modules/metrics/router/metrics.router';
import { logsRouter } from './modules/logs/router/logs.router';
import { auditRouter } from './modules/audit/router/audit.router';
import { emailRouter } from './modules/email/router/email.router';
import { notificationsRouter } from './modules/notifications/router/notifications.router';
import { alertsRouter } from './modules/alerts/router/alerts.router';
import { chatRouter } from './modules/chat/router/chat.router';
import { wikiRouter } from './modules/wiki/router/wiki.router';
import { docsRouter } from './modules/docs/router/docs.router';
import { donationsRouter } from './modules/donations/router/donations.router';
import { paymentsRouter } from './modules/payments/router/payments.router';
import { invoicesRouter } from './modules/invoices/router/invoices.router';
import { taxRouter } from './modules/tax/router/tax.router';
import { financeRouter } from './modules/finance/router/finance.router';
import { subscriptionsRouter } from './modules/subscriptions/router/subscriptions.router';
import { gamesRouter } from './modules/games/router/games.router';
import { tournamentsRouter } from './modules/tournaments/router/tournaments.router';
import { economyRouter } from './modules/economy/router/economy.router';
import { downloadsRouter } from './modules/downloads/router/downloads.router';
import { releasesRouter } from './modules/releases/router/releases.router';
import { changelogRouter } from './modules/changelog/router/changelog.router';
import { featuresRouter } from './modules/features/router/features.router';
import { archiveRouter } from './modules/archive/router/archive.router';
import { broadcastsRouter } from './modules/broadcasts/router/broadcasts.router';
import { scansRouter } from './modules/scans/router/scans.router';
import { storageRouter } from './modules/storage/router/storage.router';
import { hostingRouter } from './modules/hosting/router/hosting.router';
import { servicesRouter } from './modules/services/router/services.router';
import { ipRouter } from './modules/ip/router/ip.router';
import { apiManagementRouter } from './modules/api-management/router/api-management.router';
import { whitelistsRouter } from './modules/whitelists/router/whitelists.router';
import { accountingRouter } from './modules/accounting/router/accounting.router';
import { forumRouter } from './modules/forum/router/forum.router';
import { streamingRouter } from './modules/streaming/router/streaming.router';
import { brainRouter } from './modules/brain/router/brain.router';

export function createApp(): express.Application {
  const app = express();

  // Security
  app.use(helmet({
    contentSecurityPolicy: config.env === 'production' ? undefined : false,
  }));

  // CORS
  app.use(cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  }));

  // Parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());
  app.use(compression());

  // Rate limiting
  app.use(globalRateLimiter);

  // Request logging
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    next();
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        version: config.apiVersion,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  });

  // API Routes
  const prefix = `${config.apiPrefix}/${config.apiVersion}`;

  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/users`, usersRouter);
  app.use(`${prefix}/roles`, rolesRouter);
  app.use(`${prefix}/permissions`, permissionsRouter);
  app.use(`${prefix}/teams`, teamsRouter);
  app.use(`${prefix}/groups`, groupsRouter);
  app.use(`${prefix}/apartments`, apartmentsRouter);
  app.use(`${prefix}/areas`, areasRouter);
  app.use(`${prefix}/blog`, blogRouter);
  app.use(`${prefix}/comments`, commentsRouter);
  app.use(`${prefix}/reactions`, reactionsRouter);
  app.use(`${prefix}/tickets`, ticketsRouter);
  app.use(`${prefix}/friends`, friendsRouter);
  app.use(`${prefix}/products`, productsRouter);
  app.use(`${prefix}/licenses`, licensesRouter);
  app.use(`${prefix}/devices`, devicesRouter);
  app.use(`${prefix}/analytics`, analyticsRouter);
  app.use(`${prefix}/metrics`, metricsRouter);
  app.use(`${prefix}/logs`, logsRouter);
  app.use(`${prefix}/audit`, auditRouter);
  app.use(`${prefix}/emails`, emailRouter);
  app.use(`${prefix}/notifications`, notificationsRouter);
  app.use(`${prefix}/alerts`, alertsRouter);
  app.use(`${prefix}/chat`, chatRouter);
  app.use(`${prefix}/wiki`, wikiRouter);
  app.use(`${prefix}/docs`, docsRouter);
  app.use(`${prefix}/donations`, donationsRouter);
  app.use(`${prefix}/payments`, paymentsRouter);
  app.use(`${prefix}/invoices`, invoicesRouter);
  app.use(`${prefix}/tax`, taxRouter);
  app.use(`${prefix}/finance`, financeRouter);
  app.use(`${prefix}/subscriptions`, subscriptionsRouter);
  app.use(`${prefix}/games`, gamesRouter);
  app.use(`${prefix}/tournaments`, tournamentsRouter);
  app.use(`${prefix}/economy`, economyRouter);
  app.use(`${prefix}/downloads`, downloadsRouter);
  app.use(`${prefix}/releases`, releasesRouter);
  app.use(`${prefix}/changelog`, changelogRouter);
  app.use(`${prefix}/features`, featuresRouter);
  app.use(`${prefix}/archive`, archiveRouter);
  app.use(`${prefix}/broadcasts`, broadcastsRouter);
  app.use(`${prefix}/scans`, scansRouter);
  app.use(`${prefix}/storage`, storageRouter);
  app.use(`${prefix}/hosting`, hostingRouter);
  app.use(`${prefix}/services`, servicesRouter);
  app.use(`${prefix}/ip`, ipRouter);
  app.use(`${prefix}/api-management`, apiManagementRouter);
  app.use(`${prefix}/whitelists`, whitelistsRouter);
  app.use(`${prefix}/accounting`, accountingRouter);
  app.use(`${prefix}/forum`, forumRouter);
  app.use(`${prefix}/streaming`, streamingRouter);
  app.use(`${prefix}/brain`, brainRouter);

  // 404
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      code: 'NOT_FOUND',
    });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}
