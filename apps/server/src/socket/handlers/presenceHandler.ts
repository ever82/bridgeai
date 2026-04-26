/**
 * Presence Socket Event Handlers
 *
 * Handles user online/offline presence tracking and broadcasting.
 */
import type { Namespace, Socket } from 'socket.io';

import { connectionService } from '../../services/connectionService';

/**
 * Presence state tracking (in production, use Redis)
 */
const presenceState = new Map<
  string,
  {
    userId: string;
    status: 'online' | 'away' | 'busy' | 'offline';
    lastSeen: Date;
    customMessage?: string;
  }
>();

/**
 * Register presence event handlers
 */
export function registerPresenceHandlers(socket: Socket, nsp: Namespace): void {
  const userId = (socket as any).user?.id;
  if (!userId) return;

  // Set initial online status
  presenceState.set(userId, {
    userId,
    status: 'online',
    lastSeen: new Date(),
  });

  // Join user's own presence room for targeted updates
  socket.join(`presence:${userId}`);

  // Handle presence:update - user changes their status
  socket.on(
    'presence:update',
    (
      data: { status: 'online' | 'away' | 'busy' | 'offline'; customMessage?: string },
      callback: (response?: { success: boolean; data?: { status: string }; error?: string }) => void
    ) => {
      try {
        const entry = presenceState.get(userId);
        if (!entry) {
          callback?.({ success: false, error: 'Presence not tracked' });
          return;
        }

        const previousStatus = entry.status;
        entry.status = data.status;
        entry.lastSeen = new Date();
        entry.customMessage = data.customMessage;

        // Broadcast status change to subscribers
        nsp.to(`presence:${userId}`).emit('presence:status_changed', {
          userId,
          previousStatus,
          newStatus: data.status,
          customMessage: data.customMessage,
          timestamp: new Date().toISOString(),
        });

        callback?.({ success: true, data: { status: data.status } });
      } catch (error) {
        callback?.({ success: false, error: 'Failed to update presence' });
      }
    }
  );

  // Handle presence:subscribe - subscribe to another user's presence
  socket.on('presence:subscribe', (data: { targetUserId: string }, callback) => {
    try {
      socket.join(`presence:${data.targetUserId}`);

      // Return current status immediately
      const entry = presenceState.get(data.targetUserId);
      callback?.({
        success: true,
        data: {
          userId: data.targetUserId,
          status: entry?.status || 'offline',
          lastSeen: entry?.lastSeen?.toISOString(),
        },
      });
    } catch (error) {
      callback?.({ success: false, error: 'Failed to subscribe' });
    }
  });

  // Handle presence:unsubscribe - unsubscribe from a user's presence
  socket.on('presence:unsubscribe', (data: { targetUserId: string }, callback) => {
    try {
      socket.leave(`presence:${data.targetUserId}`);
      callback?.({ success: true });
    } catch (error) {
      callback?.({ success: false, error: 'Failed to unsubscribe' });
    }
  });

  // Handle disconnect - mark user as offline only if no other active connections
  socket.on('disconnect', () => {
    const remainingConnections = connectionService.getUserConnectionCount(userId);
    if (remainingConnections > 0) {
      return; // User still has other active connections
    }

    const entry = presenceState.get(userId);
    if (entry) {
      const previousStatus = entry.status;
      entry.status = 'offline';
      entry.lastSeen = new Date();

      // Broadcast offline status
      nsp.to(`presence:${userId}`).emit('presence:status_changed', {
        userId,
        previousStatus,
        newStatus: 'offline',
        timestamp: new Date().toISOString(),
      });
    }
  });
}

/**
 * Get presence state for a user
 */
export function getPresenceState(userId: string) {
  return presenceState.get(userId);
}

export default { registerPresenceHandlers, getPresenceState };
