/**
 * Data Masking Response Middleware
 *
 * Automatically masks sensitive fields in API responses.
 * Delegates to the existing mask utility for field-level masking.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Express middleware that intercepts JSON responses and masks sensitive fields.
 *
 * Uses the existing maskObject utility which auto-detects sensitive fields
 * based on field names and content patterns.
 */
export declare function dataMaskingMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=dataMasking.d.ts.map