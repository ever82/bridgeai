/**
 * System Event Handlers
 *
 * Handles admin system monitoring events.
 */
import type { Namespace } from 'socket.io';
import type { AuthenticatedSocket } from '../middleware/auth';
import { connectionManager } from '../connectionManager';

/**
 * Register system event handlers
 */
export function registerSystemHandlers(socket: AuthenticatedSocket, nsp: Namespace): void {
  // Get system stats
  socket.on('system:stats', (callback) => {
    const stats = connectionManager.getStats();

    callback({
      success: true,
      data: {
        ...stats,
        serverTime: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    });
  });

  // Get all connections (admin only)
  socket.on('system:connections', (callback) => {
    const connections = connectionManager.getAllConnections().map((conn) => ({
      socketId: conn.socketId,
      userId: conn.userId,
      namespace: conn.namespace,
      connectedAt: conn.connectedAt,
      lastPingAt: conn.lastPingAt,
      ipAddress: conn.ipAddress,
    }));

    callback({
      success: true,
      data: { connections, total: connections.length },
    });
  });

  // Broadcast system message (admin only)
  socket.on('system:broadcast', (data: { message: string; type?: string }, callback) => {
    const { message, type = 'info' } = data;

    // Broadcast to all namespaces
    nsp.server.of('/').emit('system:broadcast', {
      message,
      type,
      timestamp: new Date().toISOString(),
    });

    callback?.({ success: true });
  });

  // Disconnect specific socket (admin only)
  socket.on('system:disconnect_socket', async (data: { socketId: string; reason?: string }) => {
    await connectionManager.disconnectSocket(data.socketId, data.reason || 'admin action');
  });

  // Disconnect user (admin only)
  socket.on('system:disconnect_user', async (data: { userId: string; reason?: string }) => {
    await connectionManager.disconnectUser(data.userId, data.reason || 'admin action');
  });

  // Cleanup stale connections (admin only)
  socket.on('system:cleanup', (callback) => {
    connectionManager.cleanupStaleConnections();
    callback?.({ success: true });
  });

  // Health check
  socket.on('system:health', (callback) => {
    callback({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
    });
  });
}

export default { registerSystemHandlers };
