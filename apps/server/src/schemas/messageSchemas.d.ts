/**
 * Message Schemas
 *
 * Zod schemas for chat message validation
 */
import { z } from 'zod';
/**
 * Message ID validator - UUID v4 format
 */
export declare const messageIdSchema: z.ZodString;
/**
 * Conversation ID validator - UUID v4 format
 */
export declare const conversationIdSchema: z.ZodString;
/**
 * Message content validator
 */
export declare const messageContentSchema: z.ZodString;
/**
 * Message role validator
 */
export declare const messageRoleSchema: z.ZodEnum<["user", "assistant", "system", "tool"]>;
/**
 * Attachment type
 */
export declare const attachmentTypeSchema: z.ZodEnum<["image", "file", "audio", "video", "code"]>;
/**
 * File attachment schema
 */
export declare const fileAttachmentSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["image", "file", "audio", "video", "code"]>;
    name: z.ZodString;
    url: z.ZodString;
    size: z.ZodNumber;
    mimeType: z.ZodString;
    thumbnailUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    type?: "code" | "image" | "video" | "audio" | "file";
    name?: string;
    url?: string;
    thumbnailUrl?: string;
    size?: number;
    mimeType?: string;
}, {
    id?: string;
    type?: "code" | "image" | "video" | "audio" | "file";
    name?: string;
    url?: string;
    thumbnailUrl?: string;
    size?: number;
    mimeType?: string;
}>;
export type FileAttachment = z.infer<typeof fileAttachmentSchema>;
/**
 * Code attachment schema
 */
export declare const codeAttachmentSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"code">;
    language: z.ZodString;
    code: z.ZodString;
    filename: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    type?: "code";
    code?: string;
    filename?: string;
    language?: string;
}, {
    id?: string;
    type?: "code";
    code?: string;
    filename?: string;
    language?: string;
}>;
export type CodeAttachment = z.infer<typeof codeAttachmentSchema>;
/**
 * Union attachment schema
 */
export declare const attachmentSchema: z.ZodUnion<[z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["image", "file", "audio", "video", "code"]>;
    name: z.ZodString;
    url: z.ZodString;
    size: z.ZodNumber;
    mimeType: z.ZodString;
    thumbnailUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    type?: "code" | "image" | "video" | "audio" | "file";
    name?: string;
    url?: string;
    thumbnailUrl?: string;
    size?: number;
    mimeType?: string;
}, {
    id?: string;
    type?: "code" | "image" | "video" | "audio" | "file";
    name?: string;
    url?: string;
    thumbnailUrl?: string;
    size?: number;
    mimeType?: string;
}>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"code">;
    language: z.ZodString;
    code: z.ZodString;
    filename: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    type?: "code";
    code?: string;
    filename?: string;
    language?: string;
}, {
    id?: string;
    type?: "code";
    code?: string;
    filename?: string;
    language?: string;
}>]>;
export type Attachment = z.infer<typeof attachmentSchema>;
/**
 * Create conversation request
 */
export declare const createConversationSchema: z.ZodObject<{
    agentId: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    metadata?: Record<string, unknown>;
    agentId?: string;
    title?: string;
}, {
    metadata?: Record<string, unknown>;
    agentId?: string;
    title?: string;
}>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
/**
 * Send message request
 */
export declare const sendMessageRequestSchema: z.ZodObject<{
    content: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["user", "assistant", "system", "tool"]>>;
    parentMessageId: z.ZodOptional<z.ZodString>;
    attachments: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["image", "file", "audio", "video", "code"]>;
        name: z.ZodString;
        url: z.ZodString;
        size: z.ZodNumber;
        mimeType: z.ZodString;
        thumbnailUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        type?: "code" | "image" | "video" | "audio" | "file";
        name?: string;
        url?: string;
        thumbnailUrl?: string;
        size?: number;
        mimeType?: string;
    }, {
        id?: string;
        type?: "code" | "image" | "video" | "audio" | "file";
        name?: string;
        url?: string;
        thumbnailUrl?: string;
        size?: number;
        mimeType?: string;
    }>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"code">;
        language: z.ZodString;
        code: z.ZodString;
        filename: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        type?: "code";
        code?: string;
        filename?: string;
        language?: string;
    }, {
        id?: string;
        type?: "code";
        code?: string;
        filename?: string;
        language?: string;
    }>]>, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    metadata?: Record<string, unknown>;
    role?: "user" | "system" | "assistant" | "tool";
    content?: string;
    attachments?: ({
        id?: string;
        type?: "code" | "image" | "video" | "audio" | "file";
        name?: string;
        url?: string;
        thumbnailUrl?: string;
        size?: number;
        mimeType?: string;
    } | {
        id?: string;
        type?: "code";
        code?: string;
        filename?: string;
        language?: string;
    })[];
    parentMessageId?: string;
}, {
    metadata?: Record<string, unknown>;
    role?: "user" | "system" | "assistant" | "tool";
    content?: string;
    attachments?: ({
        id?: string;
        type?: "code" | "image" | "video" | "audio" | "file";
        name?: string;
        url?: string;
        thumbnailUrl?: string;
        size?: number;
        mimeType?: string;
    } | {
        id?: string;
        type?: "code";
        code?: string;
        filename?: string;
        language?: string;
    })[];
    parentMessageId?: string;
}>;
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;
/**
 * Update message request
 */
export declare const updateMessageSchema: z.ZodObject<{
    content: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    metadata?: Record<string, unknown>;
    content?: string;
}, {
    metadata?: Record<string, unknown>;
    content?: string;
}>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
/**
 * React to message request
 */
export declare const messageReactionSchema: z.ZodObject<{
    emoji: z.ZodString;
}, "strip", z.ZodTypeAny, {
    emoji?: string;
}, {
    emoji?: string;
}>;
export type MessageReactionInput = z.infer<typeof messageReactionSchema>;
/**
 * Conversation ID param
 */
export declare const conversationIdParamsSchema: z.ZodObject<{
    conversationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
}, {
    conversationId?: string;
}>;
export type ConversationIdParams = z.infer<typeof conversationIdParamsSchema>;
/**
 * Message ID param
 */
export declare const messageIdParamsSchema: z.ZodObject<{
    messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    messageId?: string;
}, {
    messageId?: string;
}>;
export type MessageIdParams = z.infer<typeof messageIdParamsSchema>;
/**
 * List messages query
 */
export declare const listMessagesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    before: z.ZodOptional<z.ZodString>;
    after: z.ZodOptional<z.ZodString>;
    includeDeleted: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    page?: number;
    before?: string;
    after?: string;
    includeDeleted?: boolean;
}, {
    limit?: number;
    page?: number;
    before?: string;
    after?: string;
    includeDeleted?: boolean;
}>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
/**
 * List conversations query
 */
export declare const listConversationsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    agentId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodEnum<["createdAt", "updatedAt", "lastMessageAt"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    isArchived: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    search?: string;
    agentId?: string;
    limit?: number;
    page?: number;
    sortBy?: "createdAt" | "updatedAt" | "lastMessageAt";
    sortOrder?: "asc" | "desc";
    isArchived?: boolean;
}, {
    search?: string;
    agentId?: string;
    limit?: number;
    page?: number;
    sortBy?: "createdAt" | "updatedAt" | "lastMessageAt";
    sortOrder?: "asc" | "desc";
    isArchived?: boolean;
}>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
/**
 * Search messages query
 */
export declare const searchMessagesQuerySchema: z.ZodObject<{
    q: z.ZodString;
    conversationId: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    limit?: number;
    page?: number;
    q?: string;
}, {
    conversationId?: string;
    limit?: number;
    page?: number;
    q?: string;
}>;
export type SearchMessagesQuery = z.infer<typeof searchMessagesQuerySchema>;
//# sourceMappingURL=messageSchemas.d.ts.map