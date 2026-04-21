/**
 * Message Service
 *
 * Handles message persistence, retrieval, sync, and read receipts.
 */
import type { MessageType, MessageStatus, Prisma } from '@prisma/client';

import { prisma } from '../db/client';

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
    .filter((userId) => userId !== senderId)
    .map((userId) =>
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
    messages.map(async (msg) => ({
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
    messages.map(async (msg) => ({
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
export async function updateMessageStatus(
  messageId: string,
  status: MessageStatus
) {
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
    offlineMessages.map(async (om) => {
      const msg = messageMap.get(om.messageId);
      if (!msg) return null;
      return {
        ...om,
        message: {
          ...msg,
          content: await encryptionService.decrypt(msg.content),
        },
      };
    }).filter(Boolean)
  );
}

/**
 * Mark offline messages as delivered
 */
export async function markOfflineMessagesDelivered(
  userId: string,
  messageIds: string[]
) {
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
    messages.map(async (msg) => ({
      ...msg,
      content: await encryptionService.decrypt(msg.content),
    }))
  );

  // Get the latest sequence ID
  const latestSequenceId = messages.length > 0
    ? messages[messages.length - 1].sequenceId ?? lastSequenceId
    : lastSequenceId;

  // Check if there are more messages
  const hasMore = await prisma.message.count({
    where: {
      conversationId,
      sequenceId: { gt: latestSequenceId },
    },
  }) > 0;

  return {
    messages: decryptedMessages,
    lastSequenceId: latestSequenceId,
    hasMore,
  };
}

/**
 * Search messages in a conversation
 */
export async function searchMessages(
  conversationId: string,
  query: string,
  limit = 20
) {
  // Search encrypted content requires special handling
  // For now, we'll search after decryption (not optimal for large datasets)
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
    },
    take: limit * 10, // Get more to filter
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

  // Decrypt and filter
  const decryptedMessages = await Promise.all(
    messages.map(async (msg) => ({
      ...msg,
      content: await encryptionService.decrypt(msg.content),
    }))
  );

  const filtered = decryptedMessages.filter((msg) =>
    msg.content.toLowerCase().includes(query.toLowerCase())
  );

  return filtered.slice(0, limit);
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
export async function editMessage(
  messageId: string,
  userId: string,
  newContent: string
) {
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

// Encryption service stub (should be implemented separately)
const encryptionService = {
  async encrypt(content: string): Promise<string> {
    // In production, use actual encryption
    return content;
  },
  async decrypt(content: string): Promise<string> {
    // In production, use actual decryption
    return content;
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
