import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

import { logger } from '../utils/logger';
import { ApiResponse } from '../utils/response';
import { AppError, MulterUploadError } from '../errors/AppError';

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

  // Handle multer upload errors
  if (err instanceof MulterUploadError) {
    res
      .status(err.statusCode)
      .json(ApiResponse.error(err.message, err.code, err.statusCode));
    return;
  }

  // Handle multer errors directly (MulterError instances)
  if (err instanceof multer.MulterError) {
    const multerErr = err;
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      res
        .status(413)
        .json(ApiResponse.error('File too large', 'FILE_TOO_LARGE', 413));
    } else {
      res
        .status(400)
        .json(ApiResponse.error(err.message, 'UPLOAD_ERROR', 400));
    }
    return;
  }

  // Handle custom file filter errors
  if (
    err.message.includes('File type not allowed') ||
    err.message.includes('File category not allowed') ||
    err.message.includes('Invalid file type') ||
    err.message.toLowerCase().includes('invalid file')
  ) {
    res.status(400).json(ApiResponse.error(err.message, 'INVALID_FILE_TYPE', 400));
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
