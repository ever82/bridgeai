/**
 * Agent Schemas
 *
 * Zod schemas for AI agent-related request validation
 */
import { z } from 'zod';
/**
 * Agent ID validator - UUID v4 format
 */
export declare const agentIdSchema: z.ZodString;
/**
 * Agent name validator
 */
export declare const agentNameSchema: z.ZodString;
/**
 * Agent description validator
 */
export declare const agentDescriptionSchema: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
/**
 * Agent model validator
 */
export declare const agentModelSchema: z.ZodDefault<z.ZodEnum<["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku", "gemini-pro", "gemini-ultra"]>>;
/**
 * Temperature validator (0-2)
 */
export declare const temperatureSchema: z.ZodDefault<z.ZodNumber>;
/**
 * Max tokens validator
 */
export declare const maxTokensSchema: z.ZodDefault<z.ZodNumber>;
/**
 * System prompt validator
 */
export declare const systemPromptSchema: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
/**
 * Create agent request
 */
export declare const createAgentSchema: z.ZodObject<{
    type: z.ZodEnum<["DEMAND", "SUPPLY", "VISIONSHARE", "AGENTDATE", "AGENTJOB", "AGENTAD"]>;
    name: z.ZodString;
    description: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    latitude: z.ZodOptional<z.ZodNumber>;
    longitude: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type?: "DEMAND" | "SUPPLY" | "VISIONSHARE" | "AGENTDATE" | "AGENTJOB" | "AGENTAD";
    description?: string;
    name?: string;
    config?: Record<string, unknown>;
    latitude?: number;
    longitude?: number;
}, {
    type?: "DEMAND" | "SUPPLY" | "VISIONSHARE" | "AGENTDATE" | "AGENTJOB" | "AGENTAD";
    description?: string;
    name?: string;
    config?: Record<string, unknown>;
    latitude?: number;
    longitude?: number;
}>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
/**
 * Update agent request
 */
export declare const updateAgentSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    model: z.ZodOptional<z.ZodDefault<z.ZodEnum<["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku", "gemini-pro", "gemini-ultra"]>>>;
    temperature: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    maxTokens: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    systemPrompt: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    isPublic: z.ZodOptional<z.ZodBoolean>;
    allowedTools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    metadata?: Record<string, unknown>;
    name?: string;
    model?: "gpt-4" | "gpt-4-turbo" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | "claude-3-haiku" | "gemini-pro" | "gemini-ultra";
    isActive?: boolean;
    isPublic?: boolean;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
    allowedTools?: string[];
}, {
    description?: string;
    metadata?: Record<string, unknown>;
    name?: string;
    model?: "gpt-4" | "gpt-4-turbo" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | "claude-3-haiku" | "gemini-pro" | "gemini-ultra";
    isActive?: boolean;
    isPublic?: boolean;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
    allowedTools?: string[];
}>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
/**
 * Send message to agent request
 */
export declare const sendMessageSchema: z.ZodObject<{
    content: z.ZodString;
    conversationId: z.ZodOptional<z.ZodString>;
    parentMessageId: z.ZodOptional<z.ZodString>;
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["image", "file", "audio", "video"]>;
        url: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type?: "image" | "video" | "audio" | "file";
        name?: string;
        url?: string;
    }, {
        type?: "image" | "video" | "audio" | "file";
        name?: string;
        url?: string;
    }>, "many">>;
    stream: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    content?: string;
    attachments?: {
        type?: "image" | "video" | "audio" | "file";
        name?: string;
        url?: string;
    }[];
    parentMessageId?: string;
    stream?: boolean;
}, {
    conversationId?: string;
    content?: string;
    attachments?: {
        type?: "image" | "video" | "audio" | "file";
        name?: string;
        url?: string;
    }[];
    parentMessageId?: string;
    stream?: boolean;
}>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
/**
 * Agent ID param
 */
export declare const agentIdParamsSchema: z.ZodObject<{
    agentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    agentId?: string;
}, {
    agentId?: string;
}>;
export type AgentIdParams = z.infer<typeof agentIdParamsSchema>;
/**
 * Agent list query parameters
 */
export declare const listAgentsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodDefault<z.ZodEnum<["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku", "gemini-pro", "gemini-ultra"]>>>;
    isPublic: z.ZodOptional<z.ZodBoolean>;
    ownerId: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodEnum<["createdAt", "name", "usageCount"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    search?: string;
    model?: "gpt-4" | "gpt-4-turbo" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | "claude-3-haiku" | "gemini-pro" | "gemini-ultra";
    isPublic?: boolean;
    ownerId?: string;
    limit?: number;
    page?: number;
    sortBy?: "createdAt" | "name" | "usageCount";
    sortOrder?: "asc" | "desc";
}, {
    search?: string;
    model?: "gpt-4" | "gpt-4-turbo" | "gpt-3.5-turbo" | "claude-3-opus" | "claude-3-sonnet" | "claude-3-haiku" | "gemini-pro" | "gemini-ultra";
    isPublic?: boolean;
    ownerId?: string;
    limit?: number;
    page?: number;
    sortBy?: "createdAt" | "name" | "usageCount";
    sortOrder?: "asc" | "desc";
}>;
export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema>;
/**
 * Agent usage statistics query
 */
export declare const agentStatsQuerySchema: z.ZodObject<{
    startDate: z.ZodOptional<z.ZodDate>;
    endDate: z.ZodOptional<z.ZodDate>;
    granularity: z.ZodDefault<z.ZodEnum<["hour", "day", "week", "month"]>>;
}, "strip", z.ZodTypeAny, {
    startDate?: Date;
    endDate?: Date;
    granularity?: "week" | "day" | "hour" | "month";
}, {
    startDate?: Date;
    endDate?: Date;
    granularity?: "week" | "day" | "hour" | "month";
}>;
export type AgentStatsQuery = z.infer<typeof agentStatsQuerySchema>;
//# sourceMappingURL=agentSchemas.d.ts.map