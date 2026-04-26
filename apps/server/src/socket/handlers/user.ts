/**
 * User Event Handlers
 *
 * Handles user-related socket events.
 */
import type { Namespace } from 'socket.io';

import type { AuthenticatedSocket } from '../middleware/auth';
import { connectionManager } from '../connectionManager';

/**
 * Register user event handlers
 */
export function registerUserHandlers(socket: AuthenticatedSocket, _nsp: Namespace): void {
  // Update user status
  socket.on('user:status', async (data: { status: string }) => {
    if (!socket.user?.id) return;

    // Broadcast status to friends/contacts
    socket.broadcast.emit('user:status_update', {
      userId: socket.user.id,
      status: data.status,
      timestamp: new Date().toISOString(),
    });
  });

  // Get user presence
  socket.on('user:presence', (data: { userIds: string[] }, callback) => {
    const presence = data.userIds.map(userId => ({
      userId,
      online: connectionManager.isUserOnline(userId),
    }));

    callback({ success: true, data: presence });
  });

  // Subscribe to user events
  socket.on('user:subscribe', (data: { userId: string }) => {
    // Only allow users to subscribe to their own user room
    if (!socket.user?.id || data.userId !== socket.user.id) {
      socket.emit('user:subscribed', {
        error: 'Cannot subscribe to another user',
      });
      return;
    }
    const room = `user:${data.userId}`;
    socket.join(room);
    socket.emit('user:subscribed', { userId: data.userId });
  });

  // Unsubscribe from user events
  socket.on('user:unsubscribe', (data: { userId: string }) => {
    // Only allow users to unsubscribe from their own user room
    if (!socket.user?.id || data.userId !== socket.user.id) {
      socket.emit('user:unsubscribed', {
        error: 'Cannot unsubscribe another user',
      });
      return;
    }
    const room = `user:${data.userId}`;
    socket.leave(room);
    socket.emit('user:unsubscribed', { userId: data.userId });
  });

  // Handle typing indicator
  socket.on('user:typing', (data: { roomId: string; isTyping: boolean }) => {
    socket.to(data.roomId).emit('user:typing', {
      userId: socket.user?.id,
      roomId: data.roomId,
      isTyping: data.isTyping,
    });
  });
}

export default { registerUserHandlers };
