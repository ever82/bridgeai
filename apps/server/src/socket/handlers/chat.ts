/**
 * Chat Event Handlers
 *
 * Handles chat-related socket events with message persistence.
 */
import type { Namespace } from 'socket.io';
import type { Prisma } from '@prisma/client';

import type { AuthenticatedSocket } from '../middleware/auth';
import { isUserInRoom } from '../../services/chat/roomService';
import {
  createChatRoomMessage,
  getChatRoomMessages,
  createReadReceipt,
  getOfflineMessages,
  markOfflineMessagesDelivered,
  syncChatRoomMessages,
  editChatRoomMessage,
  deleteChatRoomMessage,
} from '../../services/messageService';

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

      // Validate roomId is non-empty
      if (!roomId || roomId.trim().length === 0) {
        callback?.({ success: false, error: 'Room ID is required' });
        return;
      }

      // Verify database room membership before allowing socket join
      const isMember = await isUserInRoom(roomId, socket.user.id);
      if (!isMember) {
        callback?.({ success: false, error: 'Not a member of this room' });
        return;
      }

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

      // Deliver offline messages to user
      await deliverOfflineMessages(socket, roomId);

      callback?.({
        success: true,
        data: { roomId, memberCount },
      });
    } catch (error) {
      console.error('[Chat] Join error:', error);
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
      console.error('[Chat] Leave error:', error);
      callback?.({ success: false, error: 'Failed to leave room' });
    }
  });

  // Send message
  socket.on(
    'chat:message',
    async (
      data: {
        roomId: string;
        content: string;
        type?: string;
        attachments?: unknown;
        metadata?: unknown;
      },
      callback
    ) => {
      try {
        if (!socket.user?.id) {
          callback?.({ success: false, error: 'Authentication required' });
          return;
        }

        const { roomId, content, type = 'text', attachments, metadata } = data;

        // Validate user is in the room
        if (!socket.rooms.has(roomId)) {
          callback?.({ success: false, error: 'Not in room' });
          return;
        }

        // Validate content
        if (!content || content.trim().length === 0) {
          callback?.({ success: false, error: 'Message content cannot be empty' });
          return;
        }

        // Create message in database
        const message = await createChatRoomMessage({
          chatRoomId: roomId,
          senderId: socket.user.id,
          content,
          type: (type || 'TEXT').toUpperCase() as 'TEXT' | 'IMAGE' | 'FILE',
          attachments: attachments as Prisma.InputJsonValue,
          metadata: metadata as Prisma.InputJsonValue,
        });

        // Broadcast to room (including sender)
        nsp.to(roomId).emit('chat:message', {
          id: message.id,
          roomId: message.conversationId,
          senderId: message.senderId,
          sender: message.sender,
          content: message.content,
          type: message.type.toLowerCase(),
          attachments: message.attachments,
          metadata: message.metadata,
          status: message.status,
          createdAt: message.createdAt.toISOString(),
        });

        callback?.({ success: true, data: { messageId: message.id } });
      } catch (error) {
        console.error('[Chat] Message error:', error);
        callback?.({ success: false, error: 'Failed to send message' });
      }
    }
  );

  // Acknowledge message delivery
  socket.on('chat:ack', (data: { roomId: string; messageIds: string[] }, callback) => {
    try {
      if (!socket.user?.id) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId, messageIds } = data;

      // Broadcast delivery acknowledgment to room
      socket.to(roomId).emit('chat:delivered', {
        userId: socket.user.id,
        roomId,
        messageIds,
        deliveredAt: new Date().toISOString(),
      });

      callback?.({ success: true });
    } catch (error) {
      console.error('[Chat] Ack error:', error);
      callback?.({ success: false, error: 'Failed to acknowledge message' });
    }
  });

  // Mark messages as read
  socket.on('chat:read', async (data: { roomId: string; messageIds: string[] }, callback) => {
    try {
      if (!socket.user?.id) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId, messageIds } = data;

      // Limit batch size to prevent database overload
      const MAX_BATCH_SIZE = 500;
      if (messageIds.length > MAX_BATCH_SIZE) {
        callback?.({ success: false, error: `Too many message IDs (max ${MAX_BATCH_SIZE})` });
        return;
      }

      // Create read receipts
      const receipts = await Promise.all(
        messageIds.map(messageId => createReadReceipt(messageId, socket.user!.id))
      );

      // Broadcast read receipt to room
      socket.to(roomId).emit('chat:read_receipt', {
        userId: socket.user.id,
        roomId,
        messageIds,
        readAt: new Date().toISOString(),
      });

      callback?.({ success: true, data: { receipts } });
    } catch (error) {
      console.error('[Chat] Read error:', error);
      callback?.({ success: false, error: 'Failed to mark as read' });
    }
  });

  // Get message history
  socket.on(
    'chat:history',
    async (
      data: {
        roomId: string;
        limit?: number;
        before?: string;
        after?: string;
      },
      callback
    ) => {
      try {
        if (!socket.user?.id) {
          callback?.({ success: false, error: 'Authentication required' });
          return;
        }

        const { roomId, limit = 50, before, after } = data;

        const messages = await getChatRoomMessages({
          chatRoomId: roomId,
          limit,
          before: before ? new Date(before) : undefined,
          after: after ? new Date(after) : undefined,
        });

        callback?.({
          success: true,
          data: {
            messages: messages.map(msg => ({
              id: msg.id,
              roomId: msg.conversationId,
              senderId: msg.senderId,
              sender: msg.sender,
              content: msg.content,
              type: msg.type.toLowerCase(),
              attachments: msg.attachments,
              metadata: msg.metadata,
              status: msg.status,
              createdAt: msg.createdAt.toISOString(),
            })),
          },
        });
      } catch (error) {
        console.error('[Chat] History error:', error);
        callback?.({ success: false, error: 'Failed to get history' });
      }
    }
  );

  // Sync messages
  socket.on(
    'chat:sync',
    async (
      data: {
        roomId: string;
        lastMessageCreatedAt?: string;
        limit?: number;
      },
      callback
    ) => {
      try {
        if (!socket.user?.id) {
          callback?.({ success: false, error: 'Authentication required' });
          return;
        }

        const { roomId, lastMessageCreatedAt, limit = 100 } = data;

        const result = await syncChatRoomMessages({
          chatRoomId: roomId,
          lastMessageCreatedAt: lastMessageCreatedAt ? new Date(lastMessageCreatedAt) : undefined,
          limit,
        });

        callback?.({
          success: true,
          data: {
            messages: result.messages.map(msg => ({
              id: msg.id,
              roomId: msg.conversationId,
              senderId: msg.senderId,
              sender: msg.sender,
              content: msg.content,
              type: msg.type.toLowerCase(),
              attachments: msg.attachments,
              metadata: msg.metadata,
              status: msg.status,
              createdAt: msg.createdAt.toISOString(),
            })),
            lastMessageCreatedAt: result.lastMessageCreatedAt?.toISOString(),
            hasMore: result.hasMore,
          },
        });
      } catch (error) {
        console.error('[Chat] Sync error:', error);
        callback?.({ success: false, error: 'Failed to sync messages' });
      }
    }
  );

  // Edit message
  socket.on(
    'chat:edit',
    async (
      data: {
        messageId: string;
        content: string;
      },
      callback
    ) => {
      try {
        if (!socket.user?.id) {
          callback?.({ success: false, error: 'Authentication required' });
          return;
        }

        const { messageId, content } = data;

        const message = await editChatRoomMessage(messageId, socket.user.id, content);

        // Broadcast edit to room
        nsp.to(message.conversationId).emit('chat:message_edited', {
          messageId: message.id,
          content: message.content,
          editedAt: new Date().toISOString(),
        });

        callback?.({ success: true, data: { message } });
      } catch (error) {
        console.error('[Chat] Edit error:', error);
        callback?.({ success: false, error: (error as Error).message });
      }
    }
  );

  // Delete message
  socket.on(
    'chat:delete',
    async (
      data: {
        messageId: string;
      },
      callback
    ) => {
      try {
        if (!socket.user?.id) {
          callback?.({ success: false, error: 'Authentication required' });
          return;
        }

        const { messageId } = data;

        const message = await deleteChatRoomMessage(messageId, socket.user.id);

        // Broadcast delete to room
        nsp.to(message.conversationId).emit('chat:message_deleted', {
          messageId: message.id,
          deletedAt: new Date().toISOString(),
        });

        callback?.({ success: true });
      } catch (error) {
        console.error('[Chat] Delete error:', error);
        callback?.({ success: false, error: (error as Error).message });
      }
    }
  );

  // Start private conversation
  socket.on('chat:start_private', (data: { targetUserId: string }, callback) => {
    try {
      if (!socket.user?.id) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      // Validate targetUserId is non-empty
      if (!data.targetUserId || data.targetUserId.trim().length === 0) {
        callback?.({ success: false, error: 'Target user ID is required' });
        return;
      }

      // Prevent starting private chat with self
      if (data.targetUserId === socket.user.id) {
        callback?.({ success: false, error: 'Cannot start private chat with yourself' });
        return;
      }

      // Generate room ID using double-colon separator to avoid collisions
      // (colon is safe and avoids the collision issue of underscores in user IDs)
      const roomId = [socket.user.id, data.targetUserId].sort().join('::');

      socket.join(roomId);

      callback?.({
        success: true,
        data: { roomId },
      });
    } catch (error) {
      console.error('[Chat] Start private error:', error);
      callback?.({ success: false, error: 'Failed to start conversation' });
    }
  });

  // User came online - deliver offline messages
  socket.on('user:online', async callback => {
    try {
      if (!socket.user?.id) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const offlineMessages = await getOfflineMessages(socket.user.id);

      // Group by conversation
      const groupedByConversation = offlineMessages.reduce(
        (acc, om) => {
          if (!acc[om.conversationId]) {
            acc[om.conversationId] = [];
          }
          acc[om.conversationId].push(om.message);
          return acc;
        },
        {} as Record<string, (typeof offlineMessages)[0]['message'][]>
      );

      // Deliver messages per conversation
      for (const [conversationId, messages] of Object.entries(groupedByConversation)) {
        socket.emit('chat:offline_messages', {
          roomId: conversationId,
          messages: messages.map(msg => ({
            id: msg.id,
            roomId: msg.conversationId,
            senderId: msg.senderId,
            sender: msg.sender,
            content: msg.content,
            type: msg.type.toLowerCase(),
            attachments: msg.attachments,
            metadata: msg.metadata,
            status: msg.status,
            sequenceId: msg.sequenceId.toString(),
            createdAt: msg.createdAt.toISOString(),
          })),
        });

        // Mark as delivered
        await markOfflineMessagesDelivered(
          socket.user.id,
          messages.map(m => m.id)
        );
      }

      callback?.({
        success: true,
        data: {
          deliveredCount: offlineMessages.length,
        },
      });
    } catch (error) {
      console.error('[Chat] Online error:', error);
      callback?.({ success: false, error: 'Failed to get offline messages' });
    }
  });
}

/**
 * Deliver offline messages for a specific room
 */
async function deliverOfflineMessages(socket: AuthenticatedSocket, roomId: string): Promise<void> {
  if (!socket.user?.id) return;

  try {
    const offlineMessages = await getOfflineMessages(socket.user.id);
    const roomMessages = offlineMessages.filter(om => om.conversationId === roomId);

    if (roomMessages.length === 0) return;

    // Send offline messages to user
    socket.emit('chat:offline_messages', {
      roomId,
      messages: roomMessages.map(om => ({
        id: om.message.id,
        roomId: om.message.conversationId,
        senderId: om.message.senderId,
        sender: om.message.sender,
        content: om.message.content,
        type: om.message.type.toLowerCase(),
        attachments: om.message.attachments,
        metadata: om.message.metadata,
        status: om.message.status,
        sequenceId: om.message.sequenceId.toString(),
        createdAt: om.message.createdAt.toISOString(),
      })),
    });

    // Mark as delivered
    await markOfflineMessagesDelivered(
      socket.user.id,
      roomMessages.map(om => om.message.id)
    );
  } catch (error) {
    console.error('[Chat] Deliver offline messages error:', error);
  }
}

export default { registerChatHandlers };
