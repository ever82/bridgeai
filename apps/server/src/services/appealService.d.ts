/**
 * Appeal Service
 * General appeal system for moderation decisions, violations, and warnings.
 *
 * Handles appeal submission, admin review, punishment revocation,
 * and credit score restoration.
 */
import { Prisma } from '@prisma/client';
export interface AppealSubmitData {
    appealType: 'MODERATION' | 'VIOLATION' | 'WARNING' | 'OTHER';
    userId: string;
    targetId: string;
    targetType: 'report' | 'violation' | 'warning';
    reason: string;
    evidence?: unknown;
}
export interface AppealReviewData {
    reviewedBy: string;
    status: 'APPROVED' | 'REJECTED';
    reviewNote?: string;
    resolution?: string;
}
export interface AppealQueryFilters {
    status?: string;
    userId?: string;
    appealType?: string;
    page?: number;
    limit?: number;
}
export declare class AppealService {
    /**
     * Submit a new appeal
     */
    submitAppeal(data: AppealSubmitData): Promise<Prisma.AppealGetPayload<object>>;
    /**
     * List appeals with filters (admin view)
     */
    getAppeals(filters: AppealQueryFilters): Promise<{
        appeals: Prisma.AppealGetPayload<object>[];
        total: number;
        page: number;
        limit: number;
    }>;
    /**
     * Get a single appeal by ID
     */
    getAppealById(id: string): Promise<Prisma.AppealGetPayload<object> | null>;
    /**
     * Admin reviews an appeal
     */
    reviewAppeal(appealId: string, data: AppealReviewData): Promise<Prisma.AppealGetPayload<object>>;
    /**
     * Revoke punishment associated with the appeal
     */
    revokePunishment(appeal: Prisma.AppealGetPayload<object>): Promise<void>;
    /**
     * Restore credit score points for the approved appeal
     */
    restoreCreditScore(appeal: Prisma.AppealGetPayload<object>): Promise<void>;
    /**
     * Withdraw a pending appeal (owner only)
     */
    withdrawAppeal(appealId: string, userId: string): Promise<Prisma.AppealGetPayload<object>>;
    /**
     * Get appeals by user ID
     */
    getAppealsByUser(userId: string, page?: number, limit?: number): Promise<{
        appeals: Prisma.AppealGetPayload<object>[];
        total: number;
        page: number;
        limit: number;
    }>;
}
export declare const appealService: AppealService;
//# sourceMappingURL=appealService.d.ts.map