/**
 * Handoff Authentication Middleware
 *
 * Provides permission checking, rate limiting, and audit logging for handoff operations.
 */
import type { Request, Response, NextFunction } from 'express';
import { rbacService } from '../services/rbacService';
import { getRequestContext } from './requestContext';
import {
  DEFAULT_HANDOFF_CONFIG,
  HandoffErrorCode,
  type HandoffConfig,
  type HandoffAuditLog,
} from '@visionshare/shared';

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

// In-memory rate limit store (in production, use Redis)
const handoffRateLimitStore = new Map<string, number[]>();
const handoffAuditLogs: HandoffAuditLog[] = [];

/**
 * Middleware to check handoff permissions
 * Loads user permissions and determines handoff capabilities
 */
export async function handoffPermissionMiddleware(
  req: HandoffRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const context = getRequestContext(req);

  if (!req.user?.id) {
    res.status(401).json({
      success: false,
      error: { code: HandoffErrorCode.UNAUTHORIZED, message: 'Authentication required' },
    });
    return;
  }

  try {
    const userId = req.user.id;

    // Get user roles and permissions
    const [userRoles, userPermissions] = await Promise.all([
      rbacService.getUserRoles(userId),
      rbacService.getUserPermissions(userId),
    ]);

    const roleNames = userRoles.map((ur) => ur.role.name);
    const permissionNames = userPermissions.map((p) => p.name);
    const primaryRole = roleNames[0] || 'user';

    // Check if user has allowed role
    const hasAllowedRole = DEFAULT_HANDOFF_CONFIG.allowedRoles.some((role) =>
      roleNames.includes(role)
    );

    // Check rate limit
    const isRateLimited = !checkHandoffRateLimit(userId);

    // Determine capabilities
    const canTakeover = hasAllowedRole && !isRateLimited;
    const canHandoff = hasAllowedRole && !isRateLimited;

    // Attach handoff info to request
    req.handoff = {
      userId,
      role: primaryRole,
      permissions: permissionNames,
      canTakeover,
      canHandoff,
      isRateLimited,
    };

    // Log permission check for audit
    logHandoffAudit({
      id: generateAuditId(),
      conversationId: req.params.conversationId || 'unknown',
      action: 'REQUEST_TAKEOVER', // Generic action for permission check
      performedBy: userId,
      performedAt: new Date().toISOString(),
      metadata: {
        path: req.path,
        method: req.method,
        canTakeover,
        canHandoff,
        isRateLimited,
      },
    });

    next();
  } catch (error) {
    context?.logError('Handoff permission check failed', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Permission verification failed' },
    });
  }
}

/**
 * Middleware to require takeover permission
 */
export function requireTakeoverPermission(
  req: HandoffRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.handoff) {
    res.status(401).json({
      success: false,
      error: { code: HandoffErrorCode.UNAUTHORIZED, message: 'Handoff permissions not loaded' },
    });
    return;
  }

  if (!req.handoff.canTakeover) {
    const context = getRequestContext(req);
    context?.logWarning('Takeover permission denied', {
      userId: req.handoff.userId,
      role: req.handoff.role,
      isRateLimited: req.handoff.isRateLimited,
    });

    res.status(403).json({
      success: false,
      error: {
        code: req.handoff.isRateLimited ? HandoffErrorCode.RATE_LIMITED : HandoffErrorCode.UNAUTHORIZED,
        message: req.handoff.isRateLimited
          ? 'Too many handoff requests. Please try again later.'
          : 'Not authorized to request takeover',
      },
    });
    return;
  }

  next();
}

/**
 * Middleware to require handoff permission
 */
export function requireHandoffPermission(
  req: HandoffRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.handoff) {
    res.status(401).json({
      success: false,
      error: { code: HandoffErrorCode.UNAUTHORIZED, message: 'Handoff permissions not loaded' },
    });
    return;
  }

  if (!req.handoff.canHandoff) {
    const context = getRequestContext(req);
    context?.logWarning('Handoff permission denied', {
      userId: req.handoff.userId,
      role: req.handoff.role,
      isRateLimited: req.handoff.isRateLimited,
    });

    res.status(403).json({
      success: false,
      error: {
        code: req.handoff.isRateLimited ? HandoffErrorCode.RATE_LIMITED : HandoffErrorCode.UNAUTHORIZED,
        message: req.handoff.isRateLimited
          ? 'Too many handoff requests. Please try again later.'
          : 'Not authorized to request handoff',
      },
    });
    return;
  }

  next();
}

/**
 * Middleware to check frequent switching limit
 * Prevents users from switching too frequently
 */
export function checkFrequentSwitching(
  config: Partial<HandoffConfig> = {}
): (req: HandoffRequest, res: Response, next: NextFunction) => void {
  const minIntervalMs = (config.minHandoffIntervalSeconds || DEFAULT_HANDOFF_CONFIG.minHandoffIntervalSeconds) * 1000;

  return (req: HandoffRequest, res: Response, next: NextFunction): void => {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: { code: HandoffErrorCode.UNAUTHORIZED, message: 'Authentication required' },
      });
      return;
    }

    const userId = req.user.id;
    const timestamps = handoffRateLimitStore.get(userId) || [];

    if (timestamps.length > 0) {
      const lastTimestamp = timestamps[timestamps.length - 1];
      const timeSinceLastHandoff = Date.now() - lastTimestamp;

      if (timeSinceLastHandoff < minIntervalMs) {
        const context = getRequestContext(req);
        context?.logWarning('Frequent handoff detected', {
          userId,
          timeSinceLastHandoff,
          minIntervalMs,
        });

        res.status(429).json({
          success: false,
          error: {
            code: HandoffErrorCode.RATE_LIMITED,
            message: `Please wait ${Math.ceil((minIntervalMs - timeSinceLastHandoff) / 1000)} seconds before switching again`,
            retryAfter: Math.ceil((minIntervalMs - timeSinceLastHandoff) / 1000),
          },
        });
        return;
      }
    }

    next();
  };
}

/**
 * Middleware to validate forced takeover
 * Ensures user has admin role for forced takeovers
 */
export function validateForcedTakeover(
  req: HandoffRequest,
  res: Response,
  next: NextFunction
): void {
  const { force } = req.body;

  if (!force) {
    next();
    return;
  }

  if (!DEFAULT_HANDOFF_CONFIG.allowForcedTakeover) {
    res.status(403).json({
      success: false,
      error: {
        code: HandoffErrorCode.FORCE_TAKEOVER_DISABLED,
        message: 'Forced takeover is disabled',
      },
    });
    return;
  }

  // Check if user has admin role
  const hasAdminRole = req.user?.roles?.some((role) =>
    ['admin', 'super_admin'].includes(role)
  );

  if (!hasAdminRole) {
    const context = getRequestContext(req);
    context?.logWarning('Forced takeover attempted by non-admin', {
      userId: req.user?.id,
      roles: req.user?.roles,
    });

    res.status(403).json({
      success: false,
      error: {
        code: HandoffErrorCode.UNAUTHORIZED,
        message: 'Admin role required for forced takeover',
      },
    });
    return;
  }

  // Log forced takeover attempt
  logHandoffAudit({
    id: generateAuditId(),
    conversationId: req.params.conversationId || 'unknown',
    action: 'FORCE_TAKEOVER',
    performedBy: req.user?.id || 'unknown',
    performedAt: new Date().toISOString(),
    metadata: {
      path: req.path,
      method: req.method,
      hasAdminRole,
    },
  });

  next();
}

/**
 * Middleware to log handoff actions for audit
 */
export function auditHandoffAction(
  action: HandoffAuditLog['action']
): (req: HandoffRequest, res: Response, next: NextFunction) => void {
  return (req: HandoffRequest, res: Response, next: NextFunction): void => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response
    res.json = (body: any) => {
      // Log the action
      logHandoffAudit({
        id: generateAuditId(),
        conversationId: req.params.conversationId || req.body?.conversationId || 'unknown',
        action,
        performedBy: req.user?.id || 'unknown',
        performedAt: new Date().toISOString(),
        metadata: {
          path: req.path,
          method: req.method,
          body: sanitizeBody(req.body),
          responseStatus: res.statusCode,
          responseSuccess: body?.success,
        },
      });

      // Call original json method
      return originalJson(body);
    };

    next();
  };
}

/**
 * Check rate limit for handoff requests
 */
function checkHandoffRateLimit(userId: string): boolean {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  // Get user's handoff timestamps
  let timestamps = handoffRateLimitStore.get(userId) || [];

  // Filter to last hour
  timestamps = timestamps.filter((ts) => ts > oneHourAgo);

  // Check if exceeds max per hour
  if (timestamps.length >= DEFAULT_HANDOFF_CONFIG.maxHandoffsPerHour) {
    return false;
  }

  // Add current timestamp
  timestamps.push(now);
  handoffRateLimitStore.set(userId, timestamps);

  return true;
}

/**
 * Log handoff audit entry
 */
function logHandoffAudit(entry: HandoffAuditLog): void {
  handoffAuditLogs.push(entry);

  // In production, persist to database
  console.log('[Handoff Audit]', {
    id: entry.id,
    action: entry.action,
    conversationId: entry.conversationId,
    performedBy: entry.performedBy,
    performedAt: entry.performedAt,
  });
}

/**
 * Sanitize request body for audit logging
 */
function sanitizeBody(body: any): any {
  if (!body) return body;

  // Create a copy to avoid modifying original
  const sanitized = { ...body };

  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'creditCard'];
  sensitiveFields.forEach((field) => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Generate unique audit ID
 */
function generateAuditId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get handoff audit logs for a conversation
 */
export function getHandoffAuditLogs(conversationId: string): HandoffAuditLog[] {
  return handoffAuditLogs.filter((log) => log.conversationId === conversationId);
}

/**
 * Get all handoff audit logs (for admin)
 */
export function getAllHandoffAuditLogs(): HandoffAuditLog[] {
  return [...handoffAuditLogs];
}

/**
 * Clear rate limit for a user (for testing or admin override)
 */
export function clearHandoffRateLimit(userId: string): void {
  handoffRateLimitStore.delete(userId);
}

/**
 * Get rate limit status for a user
 */
export function getHandoffRateLimitStatus(userId: string): {
  current: number;
  max: number;
  resetAt: number;
} {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  const timestamps = handoffRateLimitStore.get(userId) || [];
  const recentTimestamps = timestamps.filter((ts) => ts > oneHourAgo);

  // Calculate reset time (1 hour after oldest timestamp)
  const resetAt = recentTimestamps.length > 0
    ? Math.min(...recentTimestamps) + 60 * 60 * 1000
    : now;

  return {
    current: recentTimestamps.length,
    max: DEFAULT_HANDOFF_CONFIG.maxHandoffsPerHour,
    resetAt,
  };
}

export default {
  handoffPermissionMiddleware,
  requireTakeoverPermission,
  requireHandoffPermission,
  checkFrequentSwitching,
  validateForcedTakeover,
  auditHandoffAction,
  getHandoffAuditLogs,
  getAllHandoffAuditLogs,
  clearHandoffRateLimit,
  getHandoffRateLimitStatus,
};
