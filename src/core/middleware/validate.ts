import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[target]);
      req[target] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, unknown> = {};
        for (const issue of error.issues) {
          const path = issue.path.join('.');
          details[path] = issue.message;
        }
        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
}
