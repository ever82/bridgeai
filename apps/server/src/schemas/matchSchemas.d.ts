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
    status?: "PENDING" | "REJECTED" | "ACCEPTED" | "COMPLETED" | undefined;
    limit?: number | undefined;
    sortOrder?: "desc" | "asc" | undefined;
    minScore?: number | undefined;
    maxScore?: number | undefined;
    offset?: number | undefined;
    sortBy?: "score" | "createdAt" | "creditScore" | undefined;
    demandId?: string | undefined;
    supplyId?: string | undefined;
    excludeLowCredit?: boolean | undefined;
    creditWeight?: number | undefined;
}, {
    status?: "PENDING" | "REJECTED" | "ACCEPTED" | "COMPLETED" | undefined;
    limit?: string | undefined;
    sortOrder?: "desc" | "asc" | undefined;
    minScore?: string | undefined;
    maxScore?: string | undefined;
    offset?: string | undefined;
    sortBy?: "score" | "createdAt" | "creditScore" | undefined;
    demandId?: string | undefined;
    supplyId?: string | undefined;
    excludeLowCredit?: string | undefined;
    creditWeight?: string | undefined;
}>;
export type MatchQueryInput = z.infer<typeof matchQuerySchema>;
export declare const matchActionSchema: z.ZodObject<{
    action: z.ZodEnum<["accept", "reject", "complete"]>;
}, "strip", z.ZodTypeAny, {
    action: "accept" | "reject" | "complete";
}, {
    action: "accept" | "reject" | "complete";
}>;
export type MatchAction = z.infer<typeof matchActionSchema>;
export declare const matchNotificationPrefSchema: z.ZodObject<{
    matchNotifications: z.ZodOptional<z.ZodBoolean>;
    pushEnabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    pushEnabled?: boolean | undefined;
    matchNotifications?: boolean | undefined;
}, {
    pushEnabled?: boolean | undefined;
    matchNotifications?: boolean | undefined;
}>;
export type MatchNotificationPrefInput = z.infer<typeof matchNotificationPrefSchema>;
//# sourceMappingURL=matchSchemas.d.ts.map