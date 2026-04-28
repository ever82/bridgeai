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
export declare function createConversation(data?: ConversationFactoryData): Conversation;
/**
 * Create a mock Message object
 */
export declare function createMessage(data?: MessageFactoryData): Message;
/**
 * Create multiple Conversation objects
 */
export declare function createConversations(count: number, data?: ConversationFactoryData): Conversation[];
/**
 * Create multiple Message objects
 */
export declare function createMessages(count: number, data?: MessageFactoryData): Message[];
/**
 * Create a text message
 */
export declare function createTextMessage(content?: string, data?: MessageFactoryData): Message;
/**
 * Create an image message
 */
export declare function createImageMessage(imageUrl?: string, data?: MessageFactoryData): Message;
/**
 * Create a conversation with messages
 */
export declare function createConversationWithMessages(messageCount: number, conversationData?: ConversationFactoryData, messageData?: MessageFactoryData): {
    conversation: Conversation;
    messages: Message[];
};
//# sourceMappingURL=message.factory.d.ts.map