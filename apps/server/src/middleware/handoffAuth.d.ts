/**
 * Handoff Authentication Middleware
 *
 * Provides permission checking, rate limiting, and audit logging for handoff operations.
 */
import type { Request, Response, NextFunction } from 'express';
import { type HandoffConfig, type HandoffAuditLog } from '@bridgeai/shared';
/**
 * Extended Request type with handoff info
 */
export interface HandoffRequest extends Request {
    handoff?: {
        userId: string;
        role: string;
        permissions: string[];
        canTakeover: boolean;
        canHandoff: boolean;
        isRateLimited: boolean;
    };
}
/**
 * Middleware to check handoff permissions
 * Loads user permissions and determines handoff capabilities
 */
export declare function handoffPermissionMiddleware(req: HandoffRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Middleware to require takeover permission
 */
export declare function requireTakeoverPermission(req: HandoffRequest, res: Response, next: NextFunction): void;
/**
 * Middleware to require handoff permission
 */
export declare function requireHandoffPermission(req: HandoffRequest, res: Response, next: NextFunction): void;
/**
 * Middleware to check frequent switching limit
 * Prevents users from switching too frequently
 */
export declare function checkFrequentSwitching(config?: Partial<HandoffConfig>): (req: HandoffRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to validate forced takeover
 * Ensures user has admin role for forced takeovers
 */
export declare function validateForcedTakeover(req: HandoffRequest, res: Response, next: NextFunction): void;
/**
 * Middleware to log handoff actions for audit
 */
export declare function auditHandoffAction(action: HandoffAuditLog['action']): (req: HandoffRequest, res: Response, next: NextFunction) => void;
/**
 * Get handoff audit logs for a conversation
 */
export declare function getHandoffAuditLogs(conversationId: string): HandoffAuditLog[];
/**
 * Get all handoff audit logs (for admin)
 */
export declare function getAllHandoffAuditLogs(): HandoffAuditLog[];
/**
 * Clear rate limit for a user (for testing or admin override)
 */
export declare function clearHandoffRateLimit(userId: string): void;
/**
 * Get rate limit status for a user
 */
export declare function getHandoffRateLimitStatus(userId: string): {
    current: number;
    max: number;
    resetAt: number;
};
declare const _default: {
    handoffPermissionMiddleware: typeof handoffPermissionMiddleware;
    requireTakeoverPermission: typeof requireTakeoverPermission;
    requireHandoffPermission: typeof requireHandoffPermission;
    checkFrequentSwitching: typeof checkFrequentSwitching;
    validateForcedTakeover: typeof validateForcedTakeover;
    auditHandoffAction: typeof auditHandoffAction;
    getHandoffAuditLogs: typeof getHandoffAuditLogs;
    getAllHandoffAuditLogs: typeof getAllHandoffAuditLogs;
    clearHandoffRateLimit: typeof clearHandoffRateLimit;
    getHandoffRateLimitStatus: typeof getHandoffRateLimitStatus;
};
export default _default;
//# sourceMappingURL=handoffAuth.d.ts.map