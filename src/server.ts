import http from 'http';
import { createApp } from './app';
import { config } from './core/config';
import { Database } from './core/database';
import { wsManager } from './core/websocket';
import { logger } from './core/logger';

async function bootstrap(): Promise<void> {
  try {
    await Database.connect();
    logger.info('Database connection established');

    const app = createApp();
    const server = http.createServer(app);

    wsManager.initialize(server);
    logger.info('WebSocket server initialized');

    server.listen(config.port, () => {
      logger.info(`UplyTech Central API started`, {
        port: config.port,
        env: config.env,
        apiVersion: config.apiVersion,
        prefix: `${config.apiPrefix}/${config.apiVersion}`,
      });
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      wsManager.shutdown();
      server.close(async () => {
        await Database.disconnect();
        logger.info('Server shut down gracefully');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise: String(promise) });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

bootstrap();
