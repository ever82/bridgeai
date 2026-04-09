import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/response';

/**
 * Request timeout middleware
 * Sets a timeout for requests and returns a 504 if exceeded
 */
export const timeout = (ms: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Set timeout on the request socket
    req.setTimeout(ms, () => {
      res.status(504).json(ApiResponse.error(
        'Request timeout',
        'REQUEST_TIMEOUT',
        504
      ));
    });

    // Set response timeout
    res.setTimeout(ms, () => {
      res.status(504).json(ApiResponse.error(
        'Response timeout',
        'RESPONSE_TIMEOUT',
        504
      ));
    });

    next();
  };
};
