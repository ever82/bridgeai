import { Request, Response, NextFunction } from 'express';
/**
 * Request timeout middleware
 * Sets a timeout for requests and returns a 504 if exceeded
 */
export declare const timeout: (ms: number) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=timeout.d.ts.map