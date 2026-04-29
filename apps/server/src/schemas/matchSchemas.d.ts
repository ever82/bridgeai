/**
 * Match Schemas
 *
 * Zod schemas for match-related request validation
 */
import { z } from 'zod';
export declare const matchQuerySchema: z.ZodObject<{
    demandId: z.ZodOptional<z.ZodString>;
    supplyId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        PENDING: "PENDING";
        ACCEPTED: "ACCEPTED";
        REJECTED: "REJECTED";
        COMPLETED: "COMPLETED";
    }>>;
    minScore: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    maxScore: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    excludeLowCredit: z.ZodOptional<z.ZodEffects<z.ZodString, boolean, string>>;
    creditWeight: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    sortBy: z.ZodOptional<z.ZodDefault<z.ZodEnum<["score", "createdAt", "creditScore"]>>>;
    sortOrder: z.ZodOptional<z.ZodDefault<z.ZodEnum<["asc", "desc"]>>>;
    limit: z.ZodOptional<z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>>;
    offset: z.ZodOptional<z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>>;
}, "strip", z.ZodTypeAny, {
    status?: "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED";
    demandId?: string;
    supplyId?: string;
    limit?: number;
    maxScore?: number;
    sortBy?: "createdAt" | "score" | "creditScore";
    sortOrder?: "asc" | "desc";
    offset?: number;
    minScore?: number;
    excludeLowCredit?: boolean;
    creditWeight?: number;
}, {
    status?: "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED";
    demandId?: string;
    supplyId?: string;
    limit?: string;
    maxScore?: string;
    sortBy?: "createdAt" | "score" | "creditScore";
    sortOrder?: "asc" | "desc";
    offset?: string;
    minScore?: string;
    excludeLowCredit?: string;
    creditWeight?: string;
}>;
export type MatchQueryInput = z.infer<typeof matchQuerySchema>;
export declare const matchActionSchema: z.ZodObject<{
    action: z.ZodEnum<["accept", "reject", "complete"]>;
}, "strip", z.ZodTypeAny, {
    action?: "complete" | "accept" | "reject";
}, {
    action?: "complete" | "accept" | "reject";
}>;
export type MatchAction = z.infer<typeof matchActionSchema>;
export declare const matchNotificationPrefSchema: z.ZodObject<{
    matchNotifications: z.ZodOptional<z.ZodBoolean>;
    pushEnabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    pushEnabled?: boolean;
    matchNotifications?: boolean;
}, {
    pushEnabled?: boolean;
    matchNotifications?: boolean;
}>;
export type MatchNotificationPrefInput = z.infer<typeof matchNotificationPrefSchema>;
//# sourceMappingURL=matchSchemas.d.ts.map