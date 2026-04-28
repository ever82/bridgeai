import { DisclosureLevel, DisclosureAuditEntry, DisclosureChangeRecord } from '@bridgeai/shared';
/**
 * Disclosure change log entry (before saving to DB)
 */
interface DisclosureChangeInput {
    agentId: string;
    fieldName: string;
    previousLevel: DisclosureLevel;
    newLevel: DisclosureLevel;
    changedBy: string;
}
/**
 * Access attempt log entry (before saving to DB)
 */
interface AccessAttemptInput {
    agentId: string;
    fieldName: string;
    accessedBy: string;
    ownerId: string;
    accessGranted: boolean;
    context?: Record<string, unknown>;
}
/**
 * Disclosure Audit Service
 */
export declare class DisclosureAuditService {
    private readonly MAX_HISTORY_DAYS;
    /**
     * Log a disclosure change
     */
    logDisclosureChange(change: DisclosureChangeInput): Promise<DisclosureChangeRecord>;
    /**
     * Log a field access attempt
     */
    logAccessAttempt(attempt: AccessAttemptInput): Promise<DisclosureAuditEntry>;
    /**
     * Get disclosure change history for an agent
     */
    getChangeHistory(agentId: string, limit?: number): Promise<DisclosureChangeRecord[]>;
    /**
     * Get access audit log for an agent
     */
    getAccessLog(agentId: string, options?: {
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Promise<DisclosureAuditEntry[]>;
    /**
     * Get disclosure statistics for an agent
     */
    getDisclosureStats(agentId: string): Promise<{
        totalChanges: number;
        totalAccessAttempts: number;
        deniedAccessCount: number;
        mostAccessedFields: {
            fieldName: string;
            count: number;
        }[];
    }>;
    /**
     * Get recent disclosure changes that affect a specific user
     */
    getChangesAffectingUser(userId: string, limit?: number): Promise<DisclosureChangeRecord[]>;
    /**
     * Clean up old audit records
     */
    cleanupOldRecords(): Promise<{
        deletedCount: number;
    }>;
    /**
     * Create a withdrawal record when user withdraws disclosed information
     */
    withdrawDisclosedInfo(agentId: string, fieldName: string, withdrawnBy: string, reason?: string): Promise<DisclosureChangeRecord>;
    /**
     * Check if a change should trigger notifications
     */
    private shouldNotifyChange;
    /**
     * Notify users affected by a disclosure change
     */
    private notifyAffectedUsers;
    /**
     * Notify users about withdrawn information
     */
    private notifyWithdrawal;
    /**
     * Mark a notification as sent
     */
    private markNotificationSent;
    /**
     * Save a change record to database
     */
    private saveChangeRecord;
    /**
     * Save an access entry to database
     */
    private saveAccessEntry;
    /**
     * Generate a unique ID
     */
    private generateId;
}
export declare const disclosureAuditService: DisclosureAuditService;
export default disclosureAuditService;
//# sourceMappingURL=disclosureAuditService.d.ts.map