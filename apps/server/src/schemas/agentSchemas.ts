/**
 * Agent Schemas
 *
 * Zod schemas for AI agent-related request validation
 */
import { z } from 'zod';
import { userIdSchema } from './userSchemas';

// ============================================================================
// Common Field Validators
// ============================================================================

/**
 * Agent ID validator - UUID v4 format
 */
export const agentIdSchema = z
  .string()
  .uuid('Invalid agent ID format')
  .describe('Agent ID in UUID v4 format');

/**
 * Agent name validator
 */
export const agentNameSchema = z
  .string()
  .min(1, 'Agent name is required')
  .max(100, 'Agent name must be less than 100 characters')
  .trim()
  .describe('Agent name');

/**
 * Agent description validator
 */
export const agentDescriptionSchema = z
  .string()
  .max(2000, 'Description must be less than 2000 characters')
  .optional()
  .or(z.literal(''))
  .describe('Agent description');

/**
 * Agent model validator
 */
export const agentModelSchema = z
  .enum([
    'gpt-4',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku',
    'gemini-pro',
    'gemini-ultra',
  ])
  .default('gpt-3.5-turbo')
  .describe('AI model to use');

/**
 * Temperature validator (0-2)
 */
export const temperatureSchema = z
  .number()
  .min(0, 'Temperature must be between 0 and 2')
  .max(2, 'Temperature must be between 0 and 2')
  .default(0.7)
  .describe('Sampling temperature');

/**
 * Max tokens validator
 */
export const maxTokensSchema = z
  .number()
  .int()
  .min(1, 'Max tokens must be at least 1')
  .max(8192, 'Max tokens cannot exceed 8192')
  .default(2048)
  .describe('Maximum tokens to generate');

/**
 * System prompt validator
 */
export const systemPromptSchema = z
  .string()
  .max(4000, 'System prompt must be less than 4000 characters')
  .optional()
  .or(z.literal(''))
  .describe('System prompt/instructions for the agent');

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Create agent request
 */
export const createAgentSchema = z.object({
  name: agentNameSchema,
  description: agentDescriptionSchema,
  model: agentModelSchema,
  temperature: temperatureSchema,
  maxTokens: maxTokensSchema,
  systemPrompt: systemPromptSchema,
  isPublic: z.boolean().default(false),
  allowedTools: z.array(z.string()).max(20).default([]),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;

/**
 * Update agent request
 */
export const updateAgentSchema = z.object({
  name: agentNameSchema.optional(),
  description: agentDescriptionSchema,
  model: agentModelSchema.optional(),
  temperature: temperatureSchema.optional(),
  maxTokens: maxTokensSchema.optional(),
  systemPrompt: systemPromptSchema,
  isPublic: z.boolean().optional(),
  allowedTools: z.array(z.string()).max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

/**
 * Send message to agent request
 */
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message content is required')
    .max(10000, 'Message must be less than 10000 characters')
    .trim(),
  conversationId: z.string().uuid().optional(),
  parentMessageId: z.string().uuid().optional(),
  attachments: z
    .array(
      z.object({
        type: z.enum(['image', 'file', 'audio', 'video']),
        url: z.string().url(),
        name: z.string().max(255),
      })
    )
    .max(10)
    .optional(),
  stream: z.boolean().default(false),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ============================================================================
// Params Schemas
// ============================================================================

/**
 * Agent ID param
 */
export const agentIdParamsSchema = z.object({
  agentId: agentIdSchema,
});

export type AgentIdParams = z.infer<typeof agentIdParamsSchema>;

// ============================================================================
// Query Schemas
// ============================================================================

/**
 * Agent list query parameters
 */
export const listAgentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  model: agentModelSchema.optional(),
  isPublic: z.coerce.boolean().optional(),
  ownerId: userIdSchema.optional(),
  sortBy: z.enum(['createdAt', 'name', 'usageCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema>;

/**
 * Agent usage statistics query
 */
export const agentStatsQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});

export type AgentStatsQuery = z.infer<typeof agentStatsQuerySchema>;
