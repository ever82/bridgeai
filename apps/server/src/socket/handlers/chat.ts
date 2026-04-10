/**
 * Chat Event Handlers
 *
 * Handles chat-related socket events.
 */
import type { Namespace } from 'socket.io';
import type { AuthenticatedSocket } from '../middleware/auth';

/**
 * Register chat event handlers
 */
export function registerChatHandlers(socket: AuthenticatedSocket, nsp: Namespace): void {
  // Join chat room
  socket.on('chat:join', async (data: { roomId: string }, callback) => {
    try {
      if (!socket.user?.id) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId } = data;

      // Join the room
      socket.join(roomId);

      // Notify others in the room
      socket.to(roomId).emit('chat:user_joined', {
        userId: socket.user.id,
        roomId,
        timestamp: new Date().toISOString(),
      });

      // Get room members count
      const roomSockets = await nsp.in(roomId).fetchSockets();
      const memberCount = roomSockets.length;

      callback?.({
        success: true,
        data: { roomId, memberCount },
      });
    } catch (error) {
      callback?.({ success: false, error: 'Failed to join room' });
    }
  });

  // Leave chat room
  socket.on('chat:leave', (data: { roomId: string }, callback) => {
    try {
      const { roomId } = data;

      socket.leave(roomId);

      // Notify others
      socket.to(roomId).emit('chat:user_left', {
        userId: socket.user?.id,
        roomId,
        timestamp: new Date().toISOString(),
      });

      callback?.({ success: true });
    } catch (error) {
      callback?.({ success: false, error: 'Failed to leave room' });
    }
  });

  // Send message
  socket.on('chat:message', (data: { roomId: string; content: string; type?: string }, callback) => {
    try {
      if (!socket.user?.id) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId, content, type = 'text' } = data;

      // Validate user is in the room
      if (!socket.rooms.has(roomId)) {
        callback?.({ success: false, error: 'Not in room' });
        return;
      }

      const message = {
        id: generateMessageId(),
        roomId,
        senderId: socket.user.id,
        content,
        type,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to room (including sender)
      nsp.to(roomId).emit('chat:message', message);

      callback?.({ success: true, data: { messageId: message.id } });
    } catch (error) {
      callback?.({ success: false, error: 'Failed to send message' });
    }
  });

  // Mark messages as read
  socket.on('chat:read', (data: { roomId: string; messageIds: string[] }) => {
    if (!socket.user?.id) return;

    socket.to(data.roomId).emit('chat:read_receipt', {
      userId: socket.user.id,
      roomId: data.roomId,
      messageIds: data.messageIds,
      timestamp: new Date().toISOString(),
    });
  });

  // Start private conversation
  socket.on('chat:start_private', (data: { targetUserId: string }, callback) => {
    if (!socket.user?.id) {
      callback?.({ success: false, error: 'Authentication required' });
      return;
    }

    // Generate room ID from sorted user IDs
    const roomId = [socket.user.id, data.targetUserId].sort().join('_');

    socket.join(roomId);

    callback?.({
      success: true,
      data: { roomId },
    });
  });
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default { registerChatHandlers };
