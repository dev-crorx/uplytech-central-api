import { PrismaClient } from '@prisma/client';
import { logger } from '../logger';

class Database {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!Database.instance) {
      Database.instance = new PrismaClient({
        log: [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'event' },
          { level: 'warn', emit: 'event' },
        ],
      });

      Database.instance.$on('error' as never, (e: unknown) => {
        logger.error('Prisma error', { error: e });
      });

      Database.instance.$on('warn' as never, (e: unknown) => {
        logger.warn('Prisma warning', { warning: e });
      });
    }
    return Database.instance;
  }

  static async connect(): Promise<void> {
    const prisma = Database.getInstance();
    await prisma.$connect();
    logger.info('Database connected successfully');
  }

  static async disconnect(): Promise<void> {
    if (Database.instance) {
      await Database.instance.$disconnect();
      logger.info('Database disconnected');
    }
  }
}

export const prisma = Database.getInstance();
export { Database };
