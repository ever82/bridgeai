/**
 * Security Middleware
 *
 * Provides XSS protection, SQL injection prevention, and other security measures.
 */
import type { Request, Response, NextFunction } from 'express';
/**
 * Sanitize HTML special characters
 */
export declare function escapeHtml(input: string): string;
/**
 * XSS Protection Middleware
 * Blocks requests containing potential XSS payloads
 */
export declare function xssProtection(req: Request, res: Response, next: NextFunction): void;
/**
 * SQL Injection Protection Middleware
 * Blocks requests containing potential SQL injection payloads
 */
export declare function sqlInjectionProtection(req: Request, res: Response, next: NextFunction): void;
/**
 * NoSQL Injection Protection Middleware
 * Blocks requests containing potential NoSQL injection payloads
 */
export declare function nosqlInjectionProtection(req: Request, res: Response, next: NextFunction): void;
/**
 * Helmet middleware configuration
 * Sets various HTTP headers for security
 */
export declare const helmetMiddleware: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
/**
 * Apply all security protections
 * Usage: app.use(securityProtection())
 */
export declare function securityProtection(): (typeof xssProtection)[];
export default securityProtection;
//# sourceMappingURL=security.d.ts.map