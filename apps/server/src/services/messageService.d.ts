import type { MessageType, MessageStatus, Prisma } from '@prisma/client';
/**
 * Attempt to deliver a pending offline message with retry logic.
 * Called by the queue worker when processing message-delivery jobs.
 */
export declare function deliverOfflineMessage(offlineMessageId: string, attempt?: number): Promise<{
    success: boolean;
    retryIn?: number;
}>;
/**
 * Schedule retry for a failed message delivery
 */
export declare function scheduleMessageRetry(offlineMessageId: string, retryIn: number, attempt?: number): NodeJS.Timeout;
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
export declare function createMessage(input: CreateMessageInput): Promise<{
    content: string;
    sender: {
        id: string;
        name: string;
        avatarUrl: string;
    };
    id: string;
    type: import(".prisma/client").$Enums.MessageType;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MessageStatus;
    conversationId: string;
    senderId: string;
    attachments: Prisma.JsonValue | null;
    sequenceId: number | null;
    editedAt: Date | null;
}>;
/**
 * Get messages by conversation with pagination
 */
export declare function getMessagesByConversation(filters: MessageQueryFilters): Promise<{
    content: string;
    readReceipts: {
        userId: string;
        readAt: Date;
    }[];
    sender: {
        id: string;
        name: string;
        avatarUrl: string;
    };
    id: string;
    type: import(".prisma/client").$Enums.MessageType;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MessageStatus;
    conversationId: string;
    senderId: string;
    attachments: Prisma.JsonValue | null;
    sequenceId: number | null;
    editedAt: Date | null;
}[]>;
/**
 * Get messages by IDs
 */
export declare function getMessagesByIds(messageIds: string[]): Promise<{
    content: string;
    readReceipts: {
        userId: string;
        readAt: Date;
    }[];
    sender: {
        id: string;
        name: string;
        avatarUrl: string;
    };
    id: string;
    type: import(".prisma/client").$Enums.MessageType;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MessageStatus;
    conversationId: string;
    senderId: string;
    attachments: Prisma.JsonValue | null;
    sequenceId: number | null;
    editedAt: Date | null;
}[]>;
/**
 * Get a single message by ID
 */
export declare function getMessageById(messageId: string): Promise<{
    content: string;
    readReceipts: {
        userId: string;
        readAt: Date;
    }[];
    sender: {
        id: string;
        name: string;
        avatarUrl: string;
    };
    id: string;
    type: import(".prisma/client").$Enums.MessageType;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MessageStatus;
    conversationId: string;
    senderId: string;
    attachments: Prisma.JsonValue | null;
    sequenceId: number | null;
    editedAt: Date | null;
}>;
/**
 * Update message status
 */
export declare function updateMessageStatus(messageId: string, status: MessageStatus): Promise<{
    id: string;
    type: import(".prisma/client").$Enums.MessageType;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MessageStatus;
    conversationId: string;
    senderId: string;
    content: string;
    attachments: Prisma.JsonValue | null;
    sequenceId: number | null;
    editedAt: Date | null;
}>;
/**
 * Create read receipt
 */
export declare function createReadReceipt(messageId: string, userId: string): Promise<{
    userId: string;
    id: string;
    messageId: string;
    readAt: Date;
}>;
/**
 * Get offline messages for a user
 */
export declare function getOfflineMessages(userId: string): Promise<{
    message: {
        content: string;
        sender: {
            id: string;
            name: string;
            avatarUrl: string;
        };
        id: string;
        type: import(".prisma/client").$Enums.MessageType;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
        status: import(".prisma/client").$Enums.MessageStatus;
        conversationId: string;
        senderId: string;
        attachments: Prisma.JsonValue | null;
        sequenceId: number | null;
        editedAt: Date | null;
    };
    userId: string;
    id: string;
    createdAt: Date;
    conversationId: string;
    messageId: string;
    deliveredAt: Date | null;
}[]>;
/**
 * Mark offline messages as delivered
 */
export declare function markOfflineMessagesDelivered(userId: string, messageIds: string[]): Promise<Prisma.BatchPayload>;
/**
 * Sync messages (incremental sync)
 */
export declare function syncMessages(input: SyncMessagesInput): Promise<{
    messages: {
        content: string;
        readReceipts: {
            userId: string;
            readAt: Date;
        }[];
        sender: {
            id: string;
            name: string;
            avatarUrl: string;
        };
        id: string;
        type: import(".prisma/client").$Enums.MessageType;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
        status: import(".prisma/client").$Enums.MessageStatus;
        conversationId: string;
        senderId: string;
        attachments: Prisma.JsonValue | null;
        sequenceId: number | null;
        editedAt: Date | null;
    }[];
    lastSequenceId: number;
    hasMore: boolean;
}>;
/**
 * Search messages in a conversation
 *
 * Uses database-level filtering when possible (plaintext storage).
 * Falls back to post-decryption filtering when encryption is active.
 */
export declare function searchMessages(conversationId: string, query: string, limit?: number): Promise<any[]>;
/**
 * Delete a message (soft delete)
 */
export declare function deleteMessage(messageId: string, userId: string): Promise<{
    id: string;
    type: import(".prisma/client").$Enums.MessageType;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MessageStatus;
    conversationId: string;
    senderId: string;
    content: string;
    attachments: Prisma.JsonValue | null;
    sequenceId: number | null;
    editedAt: Date | null;
}>;
/**
 * Edit a message
 */
export declare function editMessage(messageId: string, userId: string, newContent: string): Promise<{
    id: string;
    type: import(".prisma/client").$Enums.MessageType;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MessageStatus;
    conversationId: string;
    senderId: string;
    content: string;
    attachments: Prisma.JsonValue | null;
    sequenceId: number | null;
    editedAt: Date | null;
}>;
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
export declare function createChatRoomMessage(input: CreateChatRoomMessageInput): Promise<{
    sender: {
        id: string;
        name: string;
        avatarUrl: string;
    };
    content: string;
    conversationId: string;
    id: string;
    type: import(".prisma/client").$Enums.MessageType;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MessageStatus;
    senderId: string;
    attachments: Prisma.JsonValue | null;
    chatRoomId: string;
    senderType: import(".prisma/client").$Enums.SenderType;
}>;
/**
 * Get a single message by chat room ID (most recent)
 * Alias for getChatRoomMessages with limit=1 for AC compatibility
 */
export declare function findByRoomId(roomId: string): Promise<{
    content: string;
    sender: {
        id: string;
        name: string;
        avatarUrl: string;
    };
    conversationId: string;
    id: string;
    type: import(".prisma/client").$Enums.MessageType;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MessageStatus;
    senderId: string;
    attachments: Prisma.JsonValue | null;
    chatRoomId: string;
    senderType: import(".prisma/client").$Enums.SenderType;
}>;
/**
 * Get messages by chat room with pagination
 */
export declare function getChatRoomMessages(filters: {
    chatRoomId: string;
    before?: Date;
    after?: Date;
    limit?: number;
}): Promise<{
    content: string;
    sender: {
        id: string;
        name: string;
        avatarUrl: string;
    };
    conversationId: string;
    id: string;
    type: import(".prisma/client").$Enums.MessageType;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MessageStatus;
    senderId: string;
    attachments: Prisma.JsonValue | null;
    chatRoomId: string;
    senderType: import(".prisma/client").$Enums.SenderType;
}[]>;
/**
 * Sync chat room messages (incremental sync)
 */
export declare function syncChatRoomMessages(input: {
    chatRoomId: string;
    lastMessageCreatedAt?: Date;
    limit?: number;
}): Promise<{
    messages: {
        content: string;
        sender: {
            id: string;
            name: string;
            avatarUrl: string;
        };
        conversationId: string;
        id: string;
        type: import(".prisma/client").$Enums.MessageType;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
        status: import(".prisma/client").$Enums.MessageStatus;
        senderId: string;
        attachments: Prisma.JsonValue | null;
        chatRoomId: string;
        senderType: import(".prisma/client").$Enums.SenderType;
    }[];
    lastMessageCreatedAt: Date;
    hasMore: boolean;
}>;
/**
 * Edit a chat room message
 */
export declare function editChatRoomMessage(messageId: string, userId: string, newContent: string): Promise<{
    content: string;
    conversationId: string;
    id: string;
    type: import(".prisma/client").$Enums.MessageType;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MessageStatus;
    senderId: string;
    attachments: Prisma.JsonValue | null;
    chatRoomId: string;
    senderType: import(".prisma/client").$Enums.SenderType;
}>;
/**
 * Delete a chat room message (soft delete)
 */
export declare function deleteChatRoomMessage(messageId: string, userId: string): Promise<{
    conversationId: string;
    id: string;
    type: import(".prisma/client").$Enums.MessageType;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MessageStatus;
    senderId: string;
    content: string;
    attachments: Prisma.JsonValue | null;
    chatRoomId: string;
    senderType: import(".prisma/client").$Enums.SenderType;
}>;
/**
 * Search messages in a chat room (uses ChatMessage model)
 */
export declare function searchChatRoomMessages(chatRoomId: string, query: string, limit?: number): Promise<any[]>;
/**
 * Get a single chat message by ID (uses ChatMessage model)
 */
export declare function getChatMessageById(messageId: string): Promise<{
    content: string;
    sender: {
        id: string;
        name: string;
        avatarUrl: string;
    };
    conversationId: string;
    id: string;
    type: import(".prisma/client").$Enums.MessageType;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    status: import(".prisma/client").$Enums.MessageStatus;
    senderId: string;
    attachments: Prisma.JsonValue | null;
    chatRoomId: string;
    senderType: import(".prisma/client").$Enums.SenderType;
}>;
declare const _default: {
    createMessage: typeof createMessage;
    getMessagesByConversation: typeof getMessagesByConversation;
    getMessagesByIds: typeof getMessagesByIds;
    getMessageById: typeof getMessageById;
    updateMessageStatus: typeof updateMessageStatus;
    createReadReceipt: typeof createReadReceipt;
    getOfflineMessages: typeof getOfflineMessages;
    markOfflineMessagesDelivered: typeof markOfflineMessagesDelivered;
    syncMessages: typeof syncMessages;
    searchMessages: typeof searchMessages;
    deleteMessage: typeof deleteMessage;
    editMessage: typeof editMessage;
    createChatRoomMessage: typeof createChatRoomMessage;
    findByRoomId: typeof findByRoomId;
    getChatRoomMessages: typeof getChatRoomMessages;
    syncChatRoomMessages: typeof syncChatRoomMessages;
    editChatRoomMessage: typeof editChatRoomMessage;
    deleteChatRoomMessage: typeof deleteChatRoomMessage;
    searchChatRoomMessages: typeof searchChatRoomMessages;
    getChatMessageById: typeof getChatMessageById;
};
export default _default;
//# sourceMappingURL=messageService.d.ts.map