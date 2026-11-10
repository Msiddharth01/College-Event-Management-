import { Request, Response, NextFunction } from 'express';

export interface ErrorResponseBody {
  success: false;
  message: string;
  stack?: string;
  errors?: unknown;
}

export interface MongoDuplicateKeyError extends Error {
  code: number;
  keyPattern?: Record<string, number>;
  keyValue?: Record<string, unknown>;
}

/**
 * Type guard to verify if an error is a MongoDB duplicate key error (code 11000).
 */
export const isDuplicateKeyError = (error: unknown): error is MongoDuplicateKeyError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 11000
  );
};

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global centralized error-handling middleware.
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response<ErrorResponseBody>,
  _next: NextFunction
): void => {
  const isProduction: boolean = process.env.NODE_ENV === 'production';

  // Catch MongoDB unique index duplicate key error (code 11000)
  if (isDuplicateKeyError(err)) {
    const fields: string = err.keyValue ? Object.keys(err.keyValue).join(', ') : 'field';
    const message = `Duplicate entry error: A record with the specified ${fields} already exists.`;
    
    console.error(`[DuplicateKeyError 11000] ${message}`);
    res.status(409).json({
      success: false,
      message,
      ...(isProduction ? {} : { errors: err.keyValue }),
    });
    return;
  }

  const statusCode: number = 'statusCode' in err && typeof err.statusCode === 'number' 
    ? err.statusCode 
    : 500;

  const response: ErrorResponseBody = {
    success: false,
    message: err.message || 'Internal Server Error',
    ...(isProduction ? {} : { stack: err.stack }),
  };

  console.error(`[Error] ${statusCode} - ${err.message}`);

  res.status(statusCode).json(response);
};
