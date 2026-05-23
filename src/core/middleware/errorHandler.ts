import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { logger } from '../logger';
import { ApiResponse } from '../types';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      message: err.message,
      code: err.code,
      errors: err.details
        ? Object.entries(err.details).map(([field, message]) => ({
            field,
            message: String(message),
          }))
        : undefined,
    };

    res.status(err.statusCode).json(response);
    return;
  }

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
  });

  const response: ApiResponse = {
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
  };

  res.status(500).json(response);
}
