/**
 * Socket.io Authentication Middleware
 *
 * Validates JWT tokens for Socket.io connections.
 */
import type { Socket } from 'socket.io';
import { jwtService } from '../services/jwtService';
import { rbacService } from '../services/rbacService';

/**
 * Extended Socket type with user info
 */
export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    roles?: string[];
    permissions?: string[];
  };
}

/**
 * Socket.io authentication middleware
 */
export async function socketAuthMiddleware(
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    // Get token from handshake auth or query
    const token = extractToken(socket);

    if (!token) {
      next(new Error('Authentication token required'));
      return;
    }

    // Verify JWT token
    const decoded = await jwtService.verifyToken(token);

    if (!decoded || !decoded.userId) {
      next(new Error('Invalid token'));
      return;
    }

    // Get user roles and permissions
    const [roles, permissions] = await Promise.all([
      rbacService.getUserRoles(decoded.userId),
      rbacService.getUserPermissions(decoded.userId),
    ]);

    // Attach user info to socket
    socket.user = {
      id: decoded.userId,
      email: decoded.email,
      roles: roles.map((r) => r.role.name),
      permissions: permissions.map((p) => p.name),
    };

    // Join user-specific room for targeted messaging
    socket.join(`user:${decoded.userId}`);

    next();
  } catch (error) {
    console.error('[Socket.io] Auth error:', error);
    next(new Error('Authentication failed'));
  }
}

/**
 * Extract token from socket handshake
 */
function extractToken(socket: AuthenticatedSocket): string | null {
  // Try auth token first
  const authToken = socket.handshake.auth?.token;
  if (authToken) {
    return authToken.startsWith('Bearer ') ? authToken.slice(7) : authToken;
  }

  // Try query parameter
  const queryToken = socket.handshake.query?.token as string;
  if (queryToken) {
    return queryToken;
  }

  // Try headers
  const headerToken = socket.handshake.headers?.authorization;
  if (headerToken) {
    return headerToken.startsWith('Bearer ') ? headerToken.slice(7) : headerToken;
  }

  return null;
}

/**
 * Optional authentication middleware (allows guest connections)
 */
export async function optionalSocketAuthMiddleware(
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const token = extractToken(socket);

    if (!token) {
      // Allow guest connection
      socket.user = undefined;
      next();
      return;
    }

    // Verify token
    const decoded = await jwtService.verifyToken(token);

    if (decoded && decoded.userId) {
      const [roles, permissions] = await Promise.all([
        rbacService.getUserRoles(decoded.userId),
        rbacService.getUserPermissions(decoded.userId),
      ]);

      socket.user = {
        id: decoded.userId,
        email: decoded.email,
        roles: roles.map((r) => r.role.name),
        permissions: permissions.map((p) => p.name),
      };

      socket.join(`user:${decoded.userId}`);
    }

    next();
  } catch (error) {
    // Allow connection as guest on auth failure
    socket.user = undefined;
    next();
  }
}

/**
 * Check if socket is authenticated
 */
export function isAuthenticated(socket: AuthenticatedSocket): boolean {
  return !!socket.user?.id;
}

/**
 * Check if socket user has required permission
 */
export function hasPermission(socket: AuthenticatedSocket, permission: string): boolean {
  return socket.user?.permissions?.includes(permission) ?? false;
}

/**
 * Check if socket user has required role
 */
export function hasRole(socket: AuthenticatedSocket, role: string): boolean {
  return socket.user?.roles?.includes(role) ?? false;
}

export default {
  socketAuthMiddleware,
  optionalSocketAuthMiddleware,
  isAuthenticated,
  hasPermission,
  hasRole,
};
