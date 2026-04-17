import { Request, Response, NextFunction } from 'express';

import { logger } from '../utils/logger';
import { ApiResponse } from '../utils/response';
import { AppError } from '../errors/AppError';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error
  logger.error(`Error occurred: ${err.message}`, {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.requestId,
  });

  // Prevent double-sending responses
  if (res.headersSent) {
    return;
  }

  // Handle known application errors
  if (err instanceof AppError) {
    res
      .status(err.statusCode)
      .json(ApiResponse.error(err.message, err.code, err.statusCode, err.details));
    return;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    res.status(400).json(ApiResponse.error(err.message, 'VALIDATION_ERROR', 400));
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json(ApiResponse.error('Unauthorized', 'UNAUTHORIZED', 401));
    return;
  }

  if (err.name === 'SyntaxError' && 'body' in err) {
    res.status(400).json(ApiResponse.error('Invalid JSON payload', 'INVALID_JSON', 400));
    return;
  }

  // Default error response (don't leak internal details in production)
  const isDev = process.env.NODE_ENV === 'development';
  res
    .status(500)
    .json(
      ApiResponse.error(
        isDev ? err.message : 'Internal server error',
        'INTERNAL_ERROR',
        500,
        isDev ? { stack: err.stack } : undefined
      )
    );
};
