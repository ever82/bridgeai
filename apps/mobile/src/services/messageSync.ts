/**
 * Message Sync Service
 *
 * Handles message synchronization for mobile clients,
 * including offline support, incremental sync, and conflict resolution.
 */
import { socketClient } from './socketClient';
import { storage } from './storage';

// Storage keys
const SYNC_KEYS = {
  LAST_SEQUENCE_ID: (roomId: string) => `sync:seq:${roomId}`,
  PENDING_MESSAGES: 'sync:pending',
  OFFLINE_QUEUE: 'sync:offline',
  SYNC_STATE: (roomId: string) => `sync:state:${roomId}`,
};

export interface SyncState {
  lastSequenceId: string;
  lastSyncAt: string;
  hasMore: boolean;
}

export interface PendingMessage {
  id: string;
  roomId: string;
  content: string;
  type: string;
  attachments?: unknown;
  timestamp: string;
  retryCount: number;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  status: 'sent' | 'delivered' | 'read';
  sequenceId: string;
  attachments?: unknown;
  metadata?: unknown;
  editedAt?: string;
  createdAt: string;
}

/**
 * Message Sync Service
 */
class MessageSyncService {
  private syncInProgress: Set<string> = new Set();

  /**
   * Get last sequence ID for a room
   */
  async getLastSequenceId(roomId: string): Promise<string> {
    const stored = await storage.getItem(SYNC_KEYS.LAST_SEQUENCE_ID(roomId));
    return stored || '0';
  }

  /**
   * Set last sequence ID for a room
   */
  async setLastSequenceId(roomId: string, sequenceId: string): Promise<void> {
    await storage.setItem(SYNC_KEYS.LAST_SEQUENCE_ID(roomId), sequenceId);
  }

  /**
   * Sync messages for a room (incremental sync)
   */
  async syncMessages(roomId: string, options: { limit?: number } = {}): Promise<{
    messages: Message[];
    hasMore: boolean;
    lastSequenceId: string;
  }> {
    if (this.syncInProgress.has(roomId)) {
      throw new Error('Sync already in progress for this room');
    }

    this.syncInProgress.add(roomId);

    try {
      const lastSequenceId = await this.getLastSequenceId(roomId);

      return new Promise((resolve, reject) => {
        socketClient.emit('chat:sync', {
          roomId,
          lastSequenceId,
          limit: options.limit || 100,
        }, (response: any) => {
          if (response?.success) {
            const { messages, hasMore, lastSequenceId: newSequenceId } = response.data;

            // Update stored sequence ID
            this.setLastSequenceId(roomId, newSequenceId);

            // Save sync state
            this.saveSyncState(roomId, {
              lastSequenceId: newSequenceId,
              lastSyncAt: new Date().toISOString(),
              hasMore,
            });

            resolve({
              messages,
              hasMore,
              lastSequenceId: newSequenceId,
            });
          } else {
            reject(new Error(response?.error || 'Sync failed'));
          }
        });
      });
    } finally {
      this.syncInProgress.delete(roomId);
    }
  }

  /**
   * Full sync - sync all messages until no more
   */
  async fullSync(roomId: string): Promise<Message[]> {
    const allMessages: Message[] = [];
    let hasMore = true;

    while (hasMore) {
      const result = await this.syncMessages(roomId, { limit: 100 });
      allMessages.push(...result.messages);
      hasMore = result.hasMore;

      // Small delay to prevent overwhelming the server
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return allMessages;
  }

  /**
   * Get message history (for pagination)
   */
  async getHistory(
    roomId: string,
    options: { limit?: number; before?: string; after?: string } = {}
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    return new Promise((resolve, reject) => {
      socketClient.emit('chat:history', {
        roomId,
        limit: options.limit || 50,
        before: options.before,
        after: options.after,
      }, (response: any) => {
        if (response?.success) {
          resolve({
            messages: response.data.messages,
            hasMore: response.data.messages.length === (options.limit || 50),
          });
        } else {
          reject(new Error(response?.error || 'Failed to get history'));
        }
      });
    });
  }

  /**
   * Send message with offline queue support
   */
  async sendMessage(
    roomId: string,
    content: string,
    type: string = 'text',
    attachments?: unknown
  ): Promise<{ messageId: string }> {
    const pendingMessage: PendingMessage = {
      id: generateMessageId(),
      roomId,
      content,
      type,
      attachments,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    // If offline, queue the message
    if (!socketClient.isConnected()) {
      await this.queueOfflineMessage(pendingMessage);
      return { messageId: pendingMessage.id };
    }

    // Send immediately
    return new Promise((resolve, reject) => {
      socketClient.emit('chat:message', {
        roomId,
        content,
        type,
        attachments,
      }, (response: any) => {
        if (response?.success) {
          resolve({ messageId: response.data.messageId });
        } else {
          // Queue for retry if failed
          this.queueOfflineMessage(pendingMessage);
          reject(new Error(response?.error || 'Failed to send message'));
        }
      });
    });
  }

  /**
   * Queue message for offline sending
   */
  private async queueOfflineMessage(message: PendingMessage): Promise<void> {
    const queue = await this.getOfflineQueue();
    queue.push(message);
    await storage.setItem(SYNC_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  }

  /**
   * Get offline queue
   */
  async getOfflineQueue(): Promise<PendingMessage[]> {
    const stored = await storage.getItem(SYNC_KEYS.OFFLINE_QUEUE);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Process offline queue when back online
   */
  async processOfflineQueue(): Promise<void> {
    const queue = await this.getOfflineQueue();
    if (queue.length === 0) return;

    const failed: PendingMessage[] = [];

    for (const message of queue) {
      try {
        await this.sendMessage(
          message.roomId,
          message.content,
          message.type,
          message.attachments
        );
      } catch (error) {
        // Retry up to 3 times
        if (message.retryCount < 3) {
          failed.push({
            ...message,
            retryCount: message.retryCount + 1,
          });
        }
      }
    }

    // Save failed messages back to queue
    await storage.setItem(SYNC_KEYS.OFFLINE_QUEUE, JSON.stringify(failed));
  }

  /**
   * Mark messages as read
   */
  async markAsRead(roomId: string, messageIds: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      socketClient.emit('chat:read', { roomId, messageIds }, (response: any) => {
        if (response?.success) {
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to mark as read'));
        }
      });
    });
  }

  /**
   * Handle offline messages from server
   */
  handleOfflineMessages(
    roomId: string,
    messages: Message[],
    callback?: (messages: Message[]) => void
  ): void {
    // Notify the app about offline messages
    if (callback) {
      callback(messages);
    }

    // Update last sequence ID if needed
    if (messages.length > 0) {
      const maxSequenceId = messages.reduce((max, msg) => {
        const seqId = BigInt(msg.sequenceId);
        return seqId > max ? seqId : max;
      }, BigInt(0));

      this.getLastSequenceId(roomId).then((storedId) => {
        if (maxSequenceId > BigInt(storedId)) {
          this.setLastSequenceId(roomId, maxSequenceId.toString());
        }
      });
    }
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      socketClient.emit('chat:edit', { messageId, content }, (response: any) => {
        if (response?.success) {
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to edit message'));
        }
      });
    });
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      socketClient.emit('chat:delete', { messageId }, (response: any) => {
        if (response?.success) {
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to delete message'));
        }
      });
    });
  }

  /**
   * Save sync state
   */
  private async saveSyncState(roomId: string, state: SyncState): Promise<void> {
    await storage.setItem(SYNC_KEYS.SYNC_STATE(roomId), JSON.stringify(state));
  }

  /**
   * Get sync state
   */
  async getSyncState(roomId: string): Promise<SyncState | null> {
    const stored = await storage.getItem(SYNC_KEYS.SYNC_STATE(roomId));
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Clear sync state for a room
   */
  async clearSyncState(roomId: string): Promise<void> {
    await storage.removeItem(SYNC_KEYS.LAST_SEQUENCE_ID(roomId));
    await storage.removeItem(SYNC_KEYS.SYNC_STATE(roomId));
  }

  /**
   * Clear all sync data
   */
  async clearAllSyncData(): Promise<void> {
    const keys = await storage.getAllKeys();
    const syncKeys = keys.filter((key) =>
      key.startsWith('sync:')
    );
    await Promise.all(syncKeys.map((key) => storage.removeItem(key)));
  }
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Export singleton
export const messageSync = new MessageSyncService();
export default messageSync;
