/**
 * Message Schemas
 *
 * Zod schemas for chat message validation
 */
import { z } from 'zod';

import { agentIdSchema } from './agentSchemas';

// ============================================================================
// Common Field Validators
// ============================================================================

/**
 * Message ID validator - UUID v4 format
 */
export const messageIdSchema = z
  .string()
  .uuid('Invalid message ID format')
  .describe('Message ID in UUID v4 format');

/**
 * Conversation ID validator - UUID v4 format
 */
export const conversationIdSchema = z
  .string()
  .uuid('Invalid conversation ID format')
  .describe('Conversation ID in UUID v4 format');

/**
 * Message content validator
 */
export const messageContentSchema = z
  .string()
  .min(1, 'Message content is required')
  .max(20000, 'Message must be less than 20000 characters')
  .trim()
  .describe('Message content');

/**
 * Message role validator
 */
export const messageRoleSchema = z
  .enum(['user', 'assistant', 'system', 'tool'])
  .describe('Message sender role');

// ============================================================================
// Attachment Schemas
// ============================================================================

/**
 * Attachment type
 */
export const attachmentTypeSchema = z.enum([
  'image',
  'file',
  'audio',
  'video',
  'code',
]);

/**
 * File attachment schema
 */
export const fileAttachmentSchema = z.object({
  id: z.string().uuid(),
  type: attachmentTypeSchema,
  name: z.string().min(1).max(255),
  url: z.string().url(),
  size: z.number().int().min(0).max(100 * 1024 * 1024), // Max 100MB
  mimeType: z.string().max(255),
  thumbnailUrl: z.string().url().optional(),
});

export type FileAttachment = z.infer<typeof fileAttachmentSchema>;

/**
 * Code attachment schema
 */
export const codeAttachmentSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('code'),
  language: z.string().max(50),
  code: z.string().max(50000),
  filename: z.string().max(255).optional(),
});

export type CodeAttachment = z.infer<typeof codeAttachmentSchema>;

/**
 * Union attachment schema
 */
export const attachmentSchema = z.union([fileAttachmentSchema, codeAttachmentSchema]);

export type Attachment = z.infer<typeof attachmentSchema>;

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Create conversation request
 */
export const createConversationSchema = z.object({
  agentId: agentIdSchema,
  title: z
    .string()
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

/**
 * Send message request
 */
export const sendMessageRequestSchema = z.object({
  content: messageContentSchema,
  role: messageRoleSchema.default('user'),
  parentMessageId: messageIdSchema.optional(),
  attachments: z.array(attachmentSchema).max(10).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;

/**
 * Update message request
 */
export const updateMessageSchema = z.object({
  content: messageContentSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;

/**
 * React to message request
 */
export const messageReactionSchema = z.object({
  emoji: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[\u{1F300}-\u{1F9FF}]$/u, 'Must be a valid emoji'),
});

export type MessageReactionInput = z.infer<typeof messageReactionSchema>;

// ============================================================================
// Params Schemas
// ============================================================================

/**
 * Conversation ID param
 */
export const conversationIdParamsSchema = z.object({
  conversationId: conversationIdSchema,
});

export type ConversationIdParams = z.infer<typeof conversationIdParamsSchema>;

/**
 * Message ID param
 */
export const messageIdParamsSchema = z.object({
  messageId: messageIdSchema,
});

export type MessageIdParams = z.infer<typeof messageIdParamsSchema>;

// ============================================================================
// Query Schemas
// ============================================================================

/**
 * List messages query
 */
export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: messageIdSchema.optional(),
  after: messageIdSchema.optional(),
  includeDeleted: z.coerce.boolean().default(false),
});

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;

/**
 * List conversations query
 */
export const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  agentId: agentIdSchema.optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'lastMessageAt']).default('lastMessageAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  isArchived: z.coerce.boolean().optional(),
});

export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;

/**
 * Search messages query
 */
export const searchMessagesQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200),
  conversationId: conversationIdSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SearchMessagesQuery = z.infer<typeof searchMessagesQuerySchema>;
