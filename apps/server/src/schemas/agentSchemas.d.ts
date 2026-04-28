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
    name: string;
    type: "VISIONSHARE" | "AGENTDATE" | "AGENTJOB" | "AGENTAD" | "DEMAND" | "SUPPLY";
    latitude?: number | undefined;
    longitude?: number | undefined;
    description?: string | undefined;
    config?: Record<string, unknown> | undefined;
}, {
    name: string;
    type: "VISIONSHARE" | "AGENTDATE" | "AGENTJOB" | "AGENTAD" | "DEMAND" | "SUPPLY";
    latitude?: number | undefined;
    longitude?: number | undefined;
    description?: string | undefined;
    config?: Record<string, unknown> | undefined;
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
    metadata?: Record<string, unknown> | undefined;
    name?: string | undefined;
    description?: string | undefined;
    model?: "gpt-4" | "gpt-3.5-turbo" | "gpt-4-turbo" | "claude-3-opus" | "claude-3-sonnet" | "claude-3-haiku" | "gemini-pro" | "gemini-ultra" | undefined;
    maxTokens?: number | undefined;
    systemPrompt?: string | undefined;
    temperature?: number | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    allowedTools?: string[] | undefined;
}, {
    metadata?: Record<string, unknown> | undefined;
    name?: string | undefined;
    description?: string | undefined;
    model?: "gpt-4" | "gpt-3.5-turbo" | "gpt-4-turbo" | "claude-3-opus" | "claude-3-sonnet" | "claude-3-haiku" | "gemini-pro" | "gemini-ultra" | undefined;
    maxTokens?: number | undefined;
    systemPrompt?: string | undefined;
    temperature?: number | undefined;
    isActive?: boolean | undefined;
    isPublic?: boolean | undefined;
    allowedTools?: string[] | undefined;
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
        name: string;
        type: "audio" | "video" | "image" | "file";
        url: string;
    }, {
        name: string;
        type: "audio" | "video" | "image" | "file";
        url: string;
    }>, "many">>;
    stream: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    content: string;
    stream: boolean;
    attachments?: {
        name: string;
        type: "audio" | "video" | "image" | "file";
        url: string;
    }[] | undefined;
    conversationId?: string | undefined;
    parentMessageId?: string | undefined;
}, {
    content: string;
    attachments?: {
        name: string;
        type: "audio" | "video" | "image" | "file";
        url: string;
    }[] | undefined;
    conversationId?: string | undefined;
    stream?: boolean | undefined;
    parentMessageId?: string | undefined;
}>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
/**
 * Agent ID param
 */
export declare const agentIdParamsSchema: z.ZodObject<{
    agentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    agentId: string;
}, {
    agentId: string;
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
    page: number;
    limit: number;
    sortOrder: "desc" | "asc";
    sortBy: "name" | "createdAt" | "usageCount";
    search?: string | undefined;
    model?: "gpt-4" | "gpt-3.5-turbo" | "gpt-4-turbo" | "claude-3-opus" | "claude-3-sonnet" | "claude-3-haiku" | "gemini-pro" | "gemini-ultra" | undefined;
    isPublic?: boolean | undefined;
    ownerId?: string | undefined;
}, {
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortOrder?: "desc" | "asc" | undefined;
    model?: "gpt-4" | "gpt-3.5-turbo" | "gpt-4-turbo" | "claude-3-opus" | "claude-3-sonnet" | "claude-3-haiku" | "gemini-pro" | "gemini-ultra" | undefined;
    sortBy?: "name" | "createdAt" | "usageCount" | undefined;
    isPublic?: boolean | undefined;
    ownerId?: string | undefined;
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
    granularity: "hour" | "month" | "day" | "week";
    startDate?: Date | undefined;
    endDate?: Date | undefined;
}, {
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    granularity?: "hour" | "month" | "day" | "week" | undefined;
}>;
export type AgentStatsQuery = z.infer<typeof agentStatsQuerySchema>;
//# sourceMappingURL=agentSchemas.d.ts.map