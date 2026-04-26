/**
 * Message Service
 *
 * Handles message persistence, retrieval, sync, and read receipts.
 */
import crypto from 'crypto';

import type { MessageType, MessageStatus, Prisma, SenderType } from '@prisma/client';

import { prisma } from '../db/client';

/**
 * Message delivery retry configuration
 */
const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 1000; // 1 second
const MAX_RETRY_DELAY_MS = 60000; // 1 minute

/**
 * Calculate exponential backoff delay for retry attempts
 */
function calculateRetryDelay(attempt: number): number {
  const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1), MAX_RETRY_DELAY_MS);
  // Add jitter (up to 10% of delay)
  const jitter = delay * 0.1 * Math.random();
  return Math.floor(delay + jitter);
}

/**
 * Attempt to deliver a pending offline message with retry logic.
 * Called by the queue worker when processing message-delivery jobs.
 */
export async function deliverOfflineMessage(
  offlineMessageId: string,
  attempt: number = 1
): Promise<{ success: boolean; retryIn?: number }> {
  const offlineMessage = await prisma.offlineMessage.findUnique({
    where: { id: offlineMessageId },
  });

  if (!offlineMessage || offlineMessage.deliveredAt) {
    return { success: true };
  }

  try {
    // Mark as delivered (in production, this would verify socket delivery)
    await prisma.offlineMessage.update({
      where: { id: offlineMessageId },
      data: { deliveredAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    if (attempt >= MAX_RETRY_ATTEMPTS) {
      console.error(
        `[MessageService] Max retries (${MAX_RETRY_ATTEMPTS}) exceeded for offline message ${offlineMessageId}`
      );
      return { success: false };
    }

    const retryIn = calculateRetryDelay(attempt);
    console.warn(
      `[MessageService] Delivery attempt ${attempt} failed for offline message ${offlineMessageId}, retrying in ${retryIn}ms`
    );

    return { success: false, retryIn };
  }
}

/**
 * Schedule retry for a failed message delivery
 */
export function scheduleMessageRetry(
  offlineMessageId: string,
  retryIn: number,
  attempt: number = 1
): NodeJS.Timeout {
  const nextAttempt = attempt + 1;
  return setTimeout(async () => {
    const result = await deliverOfflineMessage(offlineMessageId, nextAttempt);
    if (!result.success && result.retryIn) {
      scheduleMessageRetry(offlineMessageId, result.retryIn, nextAttempt);
    }
  }, retryIn);
}

export interface CreateMessageInput {
  conversationId: string;
  senderId: string;
  content: string;
  type?: MessageType;
  attachments?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}

export interface MessageQueryFilters {
  conversationId: string;
  before?: Date;
  after?: Date;
  limit?: number;
  cursor?: string;
}

export interface SyncMessagesInput {
  conversationId: string;
  lastSequenceId?: number;
  limit?: number;
}

/**
 * Create a new message
 */
export async function createMessage(input: CreateMessageInput) {
  // Encrypt message content
  const encryptedContent = await encryptionService.encrypt(input.content);

  const message = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      senderId: input.senderId,
      content: encryptedContent,
      type: input.type || 'TEXT',
      attachments: input.attachments || null,
      metadata: input.metadata || null,
      status: 'SENT',
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Update conversation lastMessageAt (upsert to handle case where Conversation doesn't exist yet)
  await prisma.conversation.upsert({
    where: { id: input.conversationId },
    update: { lastMessageAt: new Date() },
    create: {
      id: input.conversationId,
      participantIds: [input.senderId],
      lastMessageAt: new Date(),
    },
  });

  // Create offline messages for users not currently online
  await createOfflineMessages(input.conversationId, message.id, input.senderId);

  return {
    ...message,
    content: input.content, // Return decrypted content for sender
  };
}

/**
 * Create offline message entries for users not in the room
 */
async function createOfflineMessages(
  conversationId: string,
  messageId: string,
  senderId: string
): Promise<void> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { participantIds: true },
  });

  if (!conversation) return;

  const offlinePromises = conversation.participantIds
    .filter(userId => userId !== senderId)
    .map(userId =>
      prisma.offlineMessage.create({
        data: {
          userId,
          messageId,
          conversationId,
        },
      })
    );

  await Promise.all(offlinePromises);
}

/**
 * Get messages by conversation with pagination
 */
export async function getMessagesByConversation(filters: MessageQueryFilters) {
  const { conversationId, before, after, limit = 50, cursor } = filters;

  const where: Prisma.MessageWhereInput = {
    conversationId,
  };

  if (before) {
    where.createdAt = { lt: before };
  }

  if (after) {
    where.createdAt = { ...((where.createdAt as Prisma.DateTimeFilter) || {}), gt: after };
  }

  if (cursor) {
    where.sequenceId = { lt: Number(cursor) };
  }

  const messages = await prisma.message.findMany({
    where: {
      ...where,
      NOT: { metadata: { path: ['deleted'], equals: true } },
    },
    take: limit,
    orderBy: { sequenceId: 'desc' },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      readReceipts: {
        select: {
          userId: true,
          readAt: true,
        },
      },
    },
  });

  // Decrypt messages
  const decryptedMessages = await Promise.all(
    messages.map(async msg => ({
      ...msg,
      content: await encryptionService.decrypt(msg.content),
    }))
  );

  return decryptedMessages.reverse(); // Return in chronological order
}

/**
 * Get messages by IDs
 */
export async function getMessagesByIds(messageIds: string[]) {
  const messages = await prisma.message.findMany({
    where: {
      id: { in: messageIds },
      NOT: { metadata: { path: ['deleted'], equals: true } },
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      readReceipts: {
        select: {
          userId: true,
          readAt: true,
        },
      },
    },
  });

  // Decrypt messages
  return Promise.all(
    messages.map(async msg => ({
      ...msg,
      content: await encryptionService.decrypt(msg.content),
    }))
  );
}

/**
 * Get a single message by ID
 */
export async function getMessageById(messageId: string) {
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      NOT: { metadata: { path: ['deleted'], equals: true } },
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      readReceipts: {
        select: {
          userId: true,
          readAt: true,
        },
      },
    },
  });

  if (!message) return null;

  return {
    ...message,
    content: await encryptionService.decrypt(message.content),
  };
}

/**
 * Update message status
 */
export async function updateMessageStatus(messageId: string, status: MessageStatus) {
  return prisma.message.update({
    where: { id: messageId },
    data: { status },
  });
}

/**
 * Create read receipt
 */
export async function createReadReceipt(messageId: string, userId: string) {
  // Use upsert to avoid duplicates
  const receipt = await prisma.readReceipt.upsert({
    where: {
      messageId_userId: {
        messageId,
        userId,
      },
    },
    update: {}, // No update if exists
    create: {
      messageId,
      userId,
      readAt: new Date(),
    },
  });

  // Update message status to READ if all participants have read it
  await updateMessageReadStatus(messageId);

  return receipt;
}

/**
 * Update message read status based on read receipts
 */
async function updateMessageReadStatus(messageId: string): Promise<void> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      conversation: {
        select: { participantIds: true },
      },
      readReceipts: {
        select: { userId: true },
      },
    },
  });

  if (!message || !message.conversation) return;

  const readCount = message.readReceipts.length;
  const participantCount = message.conversation.participantIds.length;

  // Exclude sender from read count requirement
  const requiredReads = participantCount - 1;

  if (readCount >= requiredReads && message.status !== 'READ') {
    await prisma.message.update({
      where: { id: messageId },
      data: { status: 'READ' },
    });
  } else if (readCount > 0 && message.status === 'SENT') {
    await prisma.message.update({
      where: { id: messageId },
      data: { status: 'DELIVERED' },
    });
  }
}

/**
 * Get offline messages for a user
 */
export async function getOfflineMessages(userId: string) {
  const offlineMessages = await prisma.offlineMessage.findMany({
    where: {
      userId,
      deliveredAt: null,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch associated messages
  const messageIds = offlineMessages.map(om => om.messageId);
  const messages = await prisma.message.findMany({
    where: { id: { in: messageIds } },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  const messageMap = new Map(messages.map(m => [m.id, m]));

  // Decrypt message content
  return Promise.all(
    offlineMessages
      .map(async om => {
        const msg = messageMap.get(om.messageId);
        if (!msg) return null;
        return {
          ...om,
          message: {
            ...msg,
            content: await encryptionService.decrypt(msg.content),
          },
        };
      })
      .filter(Boolean)
  );
}

/**
 * Mark offline messages as delivered
 */
export async function markOfflineMessagesDelivered(userId: string, messageIds: string[]) {
  return prisma.offlineMessage.updateMany({
    where: {
      userId,
      messageId: { in: messageIds },
    },
    data: {
      deliveredAt: new Date(),
    },
  });
}

/**
 * Sync messages (incremental sync)
 */
export async function syncMessages(input: SyncMessagesInput) {
  const { conversationId, lastSequenceId = 0, limit = 100 } = input;

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      sequenceId: { gt: lastSequenceId },
      NOT: { metadata: { path: ['deleted'], equals: true } },
    },
    take: limit,
    orderBy: { sequenceId: 'asc' },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      readReceipts: {
        select: {
          userId: true,
          readAt: true,
        },
      },
    },
  });

  // Decrypt messages
  const decryptedMessages = await Promise.all(
    messages.map(async msg => ({
      ...msg,
      content: await encryptionService.decrypt(msg.content),
    }))
  );

  // Get the latest sequence ID
  const latestSequenceId =
    messages.length > 0
      ? (messages[messages.length - 1].sequenceId ?? lastSequenceId)
      : lastSequenceId;

  // Check if there are more messages
  const hasMore =
    (await prisma.message.count({
      where: {
        conversationId,
        sequenceId: { gt: latestSequenceId },
        NOT: { metadata: { path: ['deleted'], equals: true } },
      },
    })) > 0;

  return {
    messages: decryptedMessages,
    lastSequenceId: latestSequenceId,
    hasMore,
  };
}

/**
 * Search messages in a conversation
 *
 * Uses database-level filtering when possible (plaintext storage).
 * Falls back to post-decryption filtering when encryption is active.
 */
export async function searchMessages(conversationId: string, query: string, limit = 20) {
  if (!encryptionService.isActive()) {
    // Database-level search for plaintext storage
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        content: { contains: query, mode: 'insensitive' },
        NOT: { metadata: { path: ['deleted'], equals: true } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return messages;
  }

  // Encrypted content requires post-decryption filtering
  // Use cursor-based pagination to avoid loading the entire history
  const batchSize = limit * 3;
  const results: any[] = [];
  let cursor: string | undefined;

  while (results.length < limit) {
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
        NOT: { metadata: { path: ['deleted'], equals: true } },
      },
      take: batchSize,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (messages.length === 0) break;

    // Decrypt and filter
    const decryptedMessages = await Promise.all(
      messages.map(async msg => ({
        ...msg,
        content: await encryptionService.decrypt(msg.content),
      }))
    );

    const filtered = decryptedMessages.filter(msg =>
      msg.content.toLowerCase().includes(query.toLowerCase())
    );

    results.push(...filtered);

    // Set cursor for next batch
    cursor = messages[messages.length - 1].createdAt.toISOString();
  }

  return results.slice(0, limit);
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { senderId: true },
  });

  if (!message || message.senderId !== userId) {
    throw new Error('Not authorized to delete this message');
  }

  return prisma.message.update({
    where: { id: messageId },
    data: {
      content: '[deleted]',
      metadata: { deleted: true, deletedAt: new Date().toISOString() },
    },
  });
}

/**
 * Edit a message
 */
export async function editMessage(messageId: string, userId: string, newContent: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { senderId: true },
  });

  if (!message || message.senderId !== userId) {
    throw new Error('Not authorized to edit this message');
  }

  const encryptedContent = await encryptionService.encrypt(newContent);

  return prisma.message.update({
    where: { id: messageId },
    data: {
      content: encryptedContent,
      editedAt: new Date(),
      metadata: { edited: true },
    },
  });
}

// Encryption service using AES-256-GCM
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Encryption service for message content.
 * Uses AES-256-GCM when ENCRYPTION_KEY is configured, otherwise stores plaintext.
 */
const encryptionService = {
  /**
   * Check if encryption is active (key is configured)
   */
  isActive(): boolean {
    return ENCRYPTION_KEY.length === 64; // 32 bytes = 64 hex chars
  },

  /**
   * Encrypt content using AES-256-GCM
   */
  async encrypt(content: string): Promise<string> {
    if (!this.isActive()) {
      return content;
    }

    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedContent
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  },

  /**
   * Decrypt content using AES-256-GCM
   */
  async decrypt(content: string): Promise<string> {
    if (!this.isActive()) {
      return content;
    }

    const parts = content.split(':');
    if (parts.length !== 3) {
      // Not encrypted (legacy plaintext)
      return content;
    }

    const [ivHex, authTagHex, encryptedContent] = parts;
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  },
};

// ============================================
// Chat Room Message Functions
//
// These functions use the ChatMessage model (linked to ChatRoom)
// instead of the Message model (linked to Conversation).
// Used by socket chat handlers for persistent chat room messaging.
// ============================================

export interface CreateChatRoomMessageInput {
  chatRoomId: string;
  senderId: string;
  content: string;
  type?: MessageType;
  attachments?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Create a message in a chat room (uses ChatMessage model)
 */
export async function createChatRoomMessage(input: CreateChatRoomMessageInput) {
  const encryptedContent = await encryptionService.encrypt(input.content);

  const chatMessage = await prisma.chatMessage.create({
    data: {
      chatRoomId: input.chatRoomId,
      senderId: input.senderId,
      senderType: 'USER' as SenderType,
      content: encryptedContent,
      type: input.type || 'TEXT',
      attachments: input.attachments || null,
      metadata: input.metadata || null,
      status: 'SENT',
    },
  });

  // Fetch sender info separately since ChatMessage doesn't have sender relation
  const sender = await prisma.user.findUnique({
    where: { id: input.senderId },
    select: { id: true, name: true, avatarUrl: true },
  });

  // Update ChatRoom lastMessageAt
  await prisma.chatRoom.update({
    where: { id: input.chatRoomId },
    data: { lastMessageAt: new Date() },
  });

  return {
    ...chatMessage,
    content: input.content, // Return decrypted content for sender
    sender,
    conversationId: input.chatRoomId, // Alias for compatibility with chat handler
  };
}

/**
 * Get a single message by chat room ID (most recent)
 * Alias for getChatRoomMessages with limit=1 for AC compatibility
 */
export async function findByRoomId(roomId: string) {
  const messages = await getChatRoomMessages({
    chatRoomId: roomId,
    limit: 1,
  });
  return messages[0] || null;
}

/**
 * Get messages by chat room with pagination
 */
export async function getChatRoomMessages(filters: {
  chatRoomId: string;
  before?: Date;
  after?: Date;
  limit?: number;
}) {
  const { chatRoomId, before, after, limit = 50 } = filters;

  const where: Prisma.ChatMessageWhereInput = {
    chatRoomId,
  };

  if (before) {
    where.createdAt = { lt: before };
  }

  if (after) {
    where.createdAt = { ...((where.createdAt as Prisma.DateTimeFilter) || {}), gt: after };
  }

  const messages = await prisma.chatMessage.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  // Get unique sender IDs and batch-fetch sender info
  const senderIds = [...new Set(messages.map(m => m.senderId))];
  const senders = await prisma.user.findMany({
    where: { id: { in: senderIds } },
    select: { id: true, name: true, avatarUrl: true },
  });
  const senderMap = new Map(senders.map(s => [s.id, s]));

  // Decrypt messages and add sender info
  const decryptedMessages = await Promise.all(
    messages.map(async msg => ({
      ...msg,
      content: await encryptionService.decrypt(msg.content),
      sender: senderMap.get(msg.senderId) || null,
      conversationId: msg.chatRoomId, // Alias for compatibility
    }))
  );

  return decryptedMessages.reverse(); // Return in chronological order
}

/**
 * Sync chat room messages (incremental sync)
 */
export async function syncChatRoomMessages(input: {
  chatRoomId: string;
  lastMessageCreatedAt?: Date;
  limit?: number;
}) {
  const { chatRoomId, lastMessageCreatedAt, limit = 100 } = input;

  const where: Prisma.ChatMessageWhereInput = {
    chatRoomId,
    ...(lastMessageCreatedAt ? { createdAt: { gt: lastMessageCreatedAt } } : {}),
  };

  const messages = await prisma.chatMessage.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  // Get unique sender IDs and batch-fetch sender info
  const senderIds = [...new Set(messages.map(m => m.senderId))];
  const senders = await prisma.user.findMany({
    where: { id: { in: senderIds } },
    select: { id: true, name: true, avatarUrl: true },
  });
  const senderMap = new Map(senders.map(s => [s.id, s]));

  // Decrypt messages
  const decryptedMessages = await Promise.all(
    messages.map(async msg => ({
      ...msg,
      content: await encryptionService.decrypt(msg.content),
      sender: senderMap.get(msg.senderId) || null,
      conversationId: msg.chatRoomId, // Alias for compatibility
    }))
  );

  const lastCreatedAt =
    messages.length > 0 ? messages[messages.length - 1].createdAt : lastMessageCreatedAt;

  // Check if there are more messages
  const hasMore =
    lastCreatedAt != null
      ? (await prisma.chatMessage.count({
          where: {
            chatRoomId,
            createdAt: { gt: lastCreatedAt },
          },
        })) > 0
      : false;

  return {
    messages: decryptedMessages,
    lastMessageCreatedAt: lastCreatedAt,
    hasMore,
  };
}

/**
 * Edit a chat room message
 */
export async function editChatRoomMessage(messageId: string, userId: string, newContent: string) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { senderId: true, chatRoomId: true },
  });

  if (!message || message.senderId !== userId) {
    throw new Error('Not authorized to edit this message');
  }

  const encryptedContent = await encryptionService.encrypt(newContent);

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      content: encryptedContent,
      metadata: { edited: true },
    },
  });

  return {
    ...updated,
    content: newContent,
    conversationId: message.chatRoomId, // Alias for compatibility
  };
}

/**
 * Delete a chat room message (soft delete)
 */
export async function deleteChatRoomMessage(messageId: string, userId: string) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { senderId: true, chatRoomId: true },
  });

  if (!message || message.senderId !== userId) {
    throw new Error('Not authorized to delete this message');
  }

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      content: '[deleted]',
      metadata: { deleted: true, deletedAt: new Date().toISOString() },
    },
  });

  return {
    ...updated,
    conversationId: message.chatRoomId, // Alias for compatibility
  };
}

/**
 * Search messages in a chat room (uses ChatMessage model)
 */
export async function searchChatRoomMessages(chatRoomId: string, query: string, limit = 20) {
  if (!encryptionService.isActive()) {
    const messages = await prisma.chatMessage.findMany({
      where: {
        chatRoomId,
        content: { contains: query, mode: 'insensitive' },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Batch-fetch sender info
    const senderIds = [...new Set(messages.map(m => m.senderId))];
    const senders = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true, avatarUrl: true },
    });
    const senderMap = new Map(senders.map(s => [s.id, s]));

    return messages.map(msg => ({
      ...msg,
      sender: senderMap.get(msg.senderId) || null,
      conversationId: msg.chatRoomId,
    }));
  }

  // Encrypted content requires post-decryption filtering
  const batchSize = limit * 3;
  const results: any[] = [];
  let cursor: string | undefined;

  while (results.length < limit) {
    const messages = await prisma.chatMessage.findMany({
      where: {
        chatRoomId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      take: batchSize,
      orderBy: { createdAt: 'desc' },
    });

    if (messages.length === 0) break;

    const decryptedMessages = await Promise.all(
      messages.map(async msg => ({
        ...msg,
        content: await encryptionService.decrypt(msg.content),
      }))
    );

    const filtered = decryptedMessages.filter(msg =>
      msg.content.toLowerCase().includes(query.toLowerCase())
    );

    results.push(...filtered);
    cursor = messages[messages.length - 1].createdAt.toISOString();
  }

  // Batch-fetch sender info for results
  const senderIds = [...new Set(results.map(m => m.senderId))];
  const senders = await prisma.user.findMany({
    where: { id: { in: senderIds } },
    select: { id: true, name: true, avatarUrl: true },
  });
  const senderMap = new Map(senders.map(s => [s.id, s]));

  return results.slice(0, limit).map(msg => ({
    ...msg,
    sender: senderMap.get(msg.senderId) || null,
    conversationId: msg.chatRoomId,
  }));
}

/**
 * Get a single chat message by ID (uses ChatMessage model)
 */
export async function getChatMessageById(messageId: string) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) return null;

  // Fetch sender info
  const sender = await prisma.user.findUnique({
    where: { id: message.senderId },
    select: { id: true, name: true, avatarUrl: true },
  });

  return {
    ...message,
    content: await encryptionService.decrypt(message.content),
    sender,
    conversationId: message.chatRoomId,
  };
}

export default {
  createMessage,
  getMessagesByConversation,
  getMessagesByIds,
  getMessageById,
  updateMessageStatus,
  createReadReceipt,
  getOfflineMessages,
  markOfflineMessagesDelivered,
  syncMessages,
  searchMessages,
  deleteMessage,
  editMessage,
  createChatRoomMessage,
  findByRoomId,
  getChatRoomMessages,
  syncChatRoomMessages,
  editChatRoomMessage,
  deleteChatRoomMessage,
  searchChatRoomMessages,
  getChatMessageById,
};
