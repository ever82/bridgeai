import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role?: string;
        userId?: string;
        [key: string]: unknown;
    };
    token?: string;
}
/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export declare function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
export declare function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
declare const _default: {
    authenticate: typeof authenticate;
    optionalAuth: typeof optionalAuth;
    requireAdmin: any;
};
export default _default;
//# sourceMappingURL=auth.d.ts.map