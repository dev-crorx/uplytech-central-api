import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'uplytech-central-api' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 10,
    }),
  ],
});

if (config.env !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

export class ModuleLogger {
  private moduleLogger: winston.Logger;

  constructor(moduleName: string) {
    this.moduleLogger = logger.child({ module: moduleName });
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.moduleLogger.info(message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.moduleLogger.error(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.moduleLogger.warn(message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.moduleLogger.debug(message, meta);
  }
}
