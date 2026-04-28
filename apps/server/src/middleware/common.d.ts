import { Request, Response, NextFunction } from 'express';
/**
 * Async handler wrapper for controllers
 * Automatically catches errors and passes them to next()
 */
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Request logging middleware with additional context
 */
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=common.d.ts.map