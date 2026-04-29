import { jwtService } from '../../services/jwtService';
import { rbacService } from '../../services/rbacService';
import { connectionManager } from '../connectionManager';
/**
 * Connection limit configuration
 */
const MAX_CONNECTIONS_PER_USER = parseInt(process.env.SOCKET_MAX_CONNECTIONS_PER_USER || '5', 10);
const MAX_TOTAL_CONNECTIONS = parseInt(process.env.SOCKET_MAX_TOTAL_CONNECTIONS || '10000', 10);
/**
 * Check connection limits for a user
 */
function checkConnectionLimits(userId) {
    const stats = connectionManager.getStats();
    // Check total connection limit
    if (stats.totalConnections >= MAX_TOTAL_CONNECTIONS) {
        return { allowed: false, reason: 'Server at maximum capacity' };
    }
    // Check per-user connection limit
    const userConnections = connectionManager.getUserConnections(userId).length;
    if (userConnections >= MAX_CONNECTIONS_PER_USER) {
        return {
            allowed: false,
            reason: `Maximum ${MAX_CONNECTIONS_PER_USER} connections per user exceeded`,
        };
    }
    return { allowed: true };
}
/**
 * Socket.io authentication middleware
 * Implements JWT verification, permission checking, user association, and connection limits
 */
export async function socketAuthMiddleware(socket, next) {
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
        // Check connection limits
        const limitCheck = checkConnectionLimits(decoded.userId);
        if (!limitCheck.allowed) {
            next(new Error(limitCheck.reason));
            return;
        }
        // Get user roles and permissions
        const [roles, permissions] = await Promise.all([
            rbacService.getUserRoles(decoded.userId),
            rbacService.getUserPermissions(decoded.userId),
        ]);
        // Attach user info to socket (user association)
        socket.user = {
            id: decoded.userId,
            email: decoded.email,
            roles: roles.map(r => r.role.name),
            permissions: permissions.map(p => p.name),
        };
        // Join user-specific room for targeted messaging
        socket.join(`user:${decoded.userId}`);
        // Enforce per-user connection limit
        const userConnections = connectionManager.getUserConnections(decoded.userId);
        if (userConnections.length >= MAX_CONNECTIONS_PER_USER) {
            next(new Error(`Connection limit exceeded (max ${MAX_CONNECTIONS_PER_USER})`));
            return;
        }
        next();
    }
    catch (error) {
        console.error('[Socket.io] Auth error:', error);
        next(new Error('Authentication failed'));
    }
}
/**
 * Extract token from socket handshake
 */
function extractToken(socket) {
    // Try auth token first
    const authToken = socket.handshake.auth?.token;
    if (authToken) {
        return stripBearerPrefix(authToken);
    }
    // Try query parameter
    const queryToken = socket.handshake.query?.token;
    if (queryToken) {
        return queryToken;
    }
    // Try headers
    const headerToken = socket.handshake.headers?.authorization;
    if (headerToken) {
        return stripBearerPrefix(headerToken);
    }
    return null;
}
/**
 * Strip "Bearer " prefix from token string (case-insensitive)
 */
function stripBearerPrefix(token) {
    if (/^bearer\s+/i.test(token)) {
        return token.slice(token.indexOf(' ') + 1).trim();
    }
    return token.trim();
}
/**
 * Optional authentication middleware (allows guest connections)
 */
export async function optionalSocketAuthMiddleware(socket, next) {
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
            // Check connection limits for authenticated users
            const limitCheck = checkConnectionLimits(decoded.userId);
            if (!limitCheck.allowed) {
                next(new Error(limitCheck.reason));
                return;
            }
            const [roles, permissions] = await Promise.all([
                rbacService.getUserRoles(decoded.userId),
                rbacService.getUserPermissions(decoded.userId),
            ]);
            socket.user = {
                id: decoded.userId,
                email: decoded.email,
                roles: roles.map(r => r.role.name),
                permissions: permissions.map(p => p.name),
            };
            socket.join(`user:${decoded.userId}`);
        }
        next();
    }
    catch (error) {
        // Allow connection as guest on auth failure
        socket.user = undefined;
        next();
    }
}
/**
 * Check if socket is authenticated
 */
export function isAuthenticated(socket) {
    return !!socket.user?.id;
}
/**
 * Check if socket user has required permission
 */
export function hasPermission(socket, permission) {
    return socket.user?.permissions?.includes(permission) ?? false;
}
/**
 * Check if socket user has required role
 */
export function hasRole(socket, role) {
    return socket.user?.roles?.includes(role) ?? false;
}
export default {
    socketAuthMiddleware,
    optionalSocketAuthMiddleware,
    isAuthenticated,
    hasPermission,
    hasRole,
};
//# sourceMappingURL=auth.js.map