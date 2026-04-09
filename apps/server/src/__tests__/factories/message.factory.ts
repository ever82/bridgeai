import { faker } from '@faker-js/faker';
import type { Conversation, Message, MessageType } from '@prisma/client';

/**
 * Factory for creating Conversation test data
 */
export interface ConversationFactoryData {
  id?: string;
  matchId?: string;
  participantIds?: string[];
  lastMessageAt?: Date | null;
  createdAt?: Date;
}

/**
 * Factory for creating Message test data
 */
export interface MessageFactoryData {
  id?: string;
  conversationId?: string;
  senderId?: string;
  content?: string;
  type?: MessageType;
  attachments?: Record<string, unknown> | null;
  createdAt?: Date;
}

/**
 * Create a mock Conversation object
 */
export function createConversation(data: ConversationFactoryData = {}): Conversation {
  const now = new Date();

  return {
    id: data.id ?? faker.string.uuid(),
    matchId: data.matchId ?? faker.string.uuid(),
    participantIds: data.participantIds ?? [faker.string.uuid(), faker.string.uuid()],
    lastMessageAt: data.lastMessageAt ?? now,
    createdAt: data.createdAt ?? now,
  };
}

/**
 * Create a mock Message object
 */
export function createMessage(data: MessageFactoryData = {}): Message {
  const now = new Date();

  return {
    id: data.id ?? faker.string.uuid(),
    conversationId: data.conversationId ?? faker.string.uuid(),
    senderId: data.senderId ?? faker.string.uuid(),
    content: data.content ?? faker.lorem.paragraph(),
    type: data.type ?? 'TEXT',
    attachments: data.attachments ?? null,
    createdAt: data.createdAt ?? now,
  };
}

/**
 * Create multiple Conversation objects
 */
export function createConversations(count: number, data: ConversationFactoryData = {}): Conversation[] {
  return Array.from({ length: count }, () => createConversation(data));
}

/**
 * Create multiple Message objects
 */
export function createMessages(count: number, data: MessageFactoryData = {}): Message[] {
  return Array.from({ length: count }, () => createMessage(data));
}

/**
 * Create a text message
 */
export function createTextMessage(content?: string, data: MessageFactoryData = {}): Message {
  return createMessage({
    type: 'TEXT',
    content: content ?? faker.lorem.sentence(),
    ...data,
  });
}

/**
 * Create an image message
 */
export function createImageMessage(imageUrl?: string, data: MessageFactoryData = {}): Message {
  return createMessage({
    type: 'IMAGE',
    content: imageUrl ?? faker.image.url(),
    ...data,
  });
}

/**
 * Create a conversation with messages
 */
export function createConversationWithMessages(
  messageCount: number,
  conversationData: ConversationFactoryData = {},
  messageData: MessageFactoryData = {}
): { conversation: Conversation; messages: Message[] } {
  const conversation = createConversation(conversationData);
  const messages = createMessages(messageCount, {
    ...messageData,
    conversationId: conversation.id,
  });

  return { conversation, messages };
}
