/**
 * Match Schemas
 *
 * Zod schemas for match-related request validation
 */
import { z } from 'zod';
import { MatchStatus } from '@prisma/client';

// ============================================================================
// Query Schemas
// ============================================================================

export const matchQuerySchema = z.object({
  demandId: z.string().uuid('Invalid demand ID format').optional(),
  supplyId: z.string().uuid('Invalid supply ID format').optional(),
  status: z.nativeEnum(MatchStatus).optional(),
  minScore: z
    .string()
    .transform((v) => parseFloat(v))
    .pipe(z.number().min(0).max(100))
    .optional(),
  maxScore: z
    .string()
    .transform((v) => parseFloat(v))
    .pipe(z.number().min(0).max(100))
    .optional(),
  excludeLowCredit: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  creditWeight: z
    .string()
    .transform((v) => parseFloat(v))
    .pipe(z.number().min(0).max(1))
    .optional(),
  sortBy: z.enum(['score', 'createdAt', 'creditScore']).default('score').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().min(1).max(100))
    .default('20')
    .optional(),
  offset: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().min(0))
    .default('0')
    .optional(),
});

export type MatchQueryInput = z.infer<typeof matchQuerySchema>;

// ============================================================================
// Action Schemas
// ============================================================================

export const matchActionSchema = z.object({
  action: z.enum(['accept', 'reject', 'complete']),
});

export type MatchAction = z.infer<typeof matchActionSchema>;

// ============================================================================
// Notification Preference Schemas
// ============================================================================

export const matchNotificationPrefSchema = z.object({
  matchNotifications: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
});

export type MatchNotificationPrefInput = z.infer<typeof matchNotificationPrefSchema>;
