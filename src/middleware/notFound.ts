import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * 404 Not Found middleware for unhandled route requests.
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error: AppError = new AppError(`Resource not found - ${req.originalUrl}`, 404);
  next(error);
};

