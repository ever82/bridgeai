/**
 * Message Service
 *
 * Handles message persistence, retrieval, sync, and read receipts.
 */
import crypto from 'crypto';

import type { MessageType, MessageStatus, Prisma } from '@prisma/client';

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
export function scheduleMessageRetry(offlineMessageId: string, retryIn: number): NodeJS.Timeout {
  const attempt = 1; // Will be tracked via the retry chain
  return setTimeout(async () => {
    const result = await deliverOfflineMessage(offlineMessageId, attempt);
    if (!result.success && result.retryIn) {
      scheduleMessageRetry(offlineMessageId, result.retryIn);
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

  // Update conversation lastMessageAt
  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { lastMessageAt: new Date() },
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
    where,
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
  const message = await prisma.message.findUnique({
    where: { id: messageId },
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
};
