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
    id: string;
    name: string;
    type: "audio" | "code" | "video" | "image" | "file";
    size: number;
    url: string;
    mimeType: string;
    thumbnailUrl?: string | undefined;
}, {
    id: string;
    name: string;
    type: "audio" | "code" | "video" | "image" | "file";
    size: number;
    url: string;
    mimeType: string;
    thumbnailUrl?: string | undefined;
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
    code: string;
    id: string;
    type: "code";
    language: string;
    filename?: string | undefined;
}, {
    code: string;
    id: string;
    type: "code";
    language: string;
    filename?: string | undefined;
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
    id: string;
    name: string;
    type: "audio" | "code" | "video" | "image" | "file";
    size: number;
    url: string;
    mimeType: string;
    thumbnailUrl?: string | undefined;
}, {
    id: string;
    name: string;
    type: "audio" | "code" | "video" | "image" | "file";
    size: number;
    url: string;
    mimeType: string;
    thumbnailUrl?: string | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"code">;
    language: z.ZodString;
    code: z.ZodString;
    filename: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    id: string;
    type: "code";
    language: string;
    filename?: string | undefined;
}, {
    code: string;
    id: string;
    type: "code";
    language: string;
    filename?: string | undefined;
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
    agentId: string;
    title?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    agentId: string;
    title?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
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
        id: string;
        name: string;
        type: "audio" | "code" | "video" | "image" | "file";
        size: number;
        url: string;
        mimeType: string;
        thumbnailUrl?: string | undefined;
    }, {
        id: string;
        name: string;
        type: "audio" | "code" | "video" | "image" | "file";
        size: number;
        url: string;
        mimeType: string;
        thumbnailUrl?: string | undefined;
    }>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"code">;
        language: z.ZodString;
        code: z.ZodString;
        filename: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        id: string;
        type: "code";
        language: string;
        filename?: string | undefined;
    }, {
        code: string;
        id: string;
        type: "code";
        language: string;
        filename?: string | undefined;
    }>]>, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    content: string;
    role: "user" | "assistant" | "system" | "tool";
    metadata?: Record<string, unknown> | undefined;
    attachments?: ({
        id: string;
        name: string;
        type: "audio" | "code" | "video" | "image" | "file";
        size: number;
        url: string;
        mimeType: string;
        thumbnailUrl?: string | undefined;
    } | {
        code: string;
        id: string;
        type: "code";
        language: string;
        filename?: string | undefined;
    })[] | undefined;
    parentMessageId?: string | undefined;
}, {
    content: string;
    metadata?: Record<string, unknown> | undefined;
    role?: "user" | "assistant" | "system" | "tool" | undefined;
    attachments?: ({
        id: string;
        name: string;
        type: "audio" | "code" | "video" | "image" | "file";
        size: number;
        url: string;
        mimeType: string;
        thumbnailUrl?: string | undefined;
    } | {
        code: string;
        id: string;
        type: "code";
        language: string;
        filename?: string | undefined;
    })[] | undefined;
    parentMessageId?: string | undefined;
}>;
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;
/**
 * Update message request
 */
export declare const updateMessageSchema: z.ZodObject<{
    content: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    metadata?: Record<string, unknown> | undefined;
    content?: string | undefined;
}, {
    metadata?: Record<string, unknown> | undefined;
    content?: string | undefined;
}>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
/**
 * React to message request
 */
export declare const messageReactionSchema: z.ZodObject<{
    emoji: z.ZodString;
}, "strip", z.ZodTypeAny, {
    emoji: string;
}, {
    emoji: string;
}>;
export type MessageReactionInput = z.infer<typeof messageReactionSchema>;
/**
 * Conversation ID param
 */
export declare const conversationIdParamsSchema: z.ZodObject<{
    conversationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    conversationId: string;
}, {
    conversationId: string;
}>;
export type ConversationIdParams = z.infer<typeof conversationIdParamsSchema>;
/**
 * Message ID param
 */
export declare const messageIdParamsSchema: z.ZodObject<{
    messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    messageId: string;
}, {
    messageId: string;
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
    page: number;
    limit: number;
    includeDeleted: boolean;
    before?: string | undefined;
    after?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    before?: string | undefined;
    after?: string | undefined;
    includeDeleted?: boolean | undefined;
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
    page: number;
    limit: number;
    sortOrder: "desc" | "asc";
    sortBy: "createdAt" | "updatedAt" | "lastMessageAt";
    search?: string | undefined;
    agentId?: string | undefined;
    isArchived?: boolean | undefined;
}, {
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    agentId?: string | undefined;
    sortOrder?: "desc" | "asc" | undefined;
    sortBy?: "createdAt" | "updatedAt" | "lastMessageAt" | undefined;
    isArchived?: boolean | undefined;
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
    q: string;
    page: number;
    limit: number;
    conversationId?: string | undefined;
}, {
    q: string;
    page?: number | undefined;
    limit?: number | undefined;
    conversationId?: string | undefined;
}>;
export type SearchMessagesQuery = z.infer<typeof searchMessagesQuerySchema>;
//# sourceMappingURL=messageSchemas.d.ts.map