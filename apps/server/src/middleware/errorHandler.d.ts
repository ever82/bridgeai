import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
export declare const errorHandler: (err: Error | AppError, req: Request, res: Response, _next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map