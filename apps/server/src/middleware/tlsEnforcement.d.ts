/**
 * TLS Enforcement Middleware
 *
 * Enforces HTTPS connections in production.
 * Redirects HTTP requests to HTTPS and sets Strict-Transport-Security headers.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Redirect HTTP to HTTPS and set HSTS headers in production
 */
export declare function tlsEnforcement(): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=tlsEnforcement.d.ts.map