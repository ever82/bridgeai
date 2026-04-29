/**
 * Upload Audit Service
 *
 * Provides audit logging for file uploads including:
 * - Upload attempt tracking (success/failure)
 * - Violation recording and tracking
 * - User upload history
 * - Restriction management for violating users
 *
 * Note: This is an in-memory implementation. For production,
 * this should be backed by a database (e.g., Prisma).
 */
/**
 * Upload audit entry representing a single upload attempt
 */
export interface UploadAuditEntry {
    userId: string;
    fileId?: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    status: 'success' | 'rejected' | 'failed';
    reason?: string;
    ip?: string;
    timestamp: Date;
}
/**
 * Violation record for a user
 */
export interface ViolationRecord {
    userId: string;
    count: number;
    lastViolation: Date;
    restricted: boolean;
}
/**
 * Upload Audit Service - singleton
 * Logs all upload attempts, tracks violations, and enforces restrictions
 */
export declare class UploadAuditService {
    private auditLog;
    private violations;
    private static _instance;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): UploadAuditService;
    /**
     * Log an upload attempt
     */
    logUpload(entry: Omit<UploadAuditEntry, 'timestamp'>): void;
    /**
     * Get violation count for a user
     */
    getViolationCount(userId: string): number;
    /**
     * Check if a user is restricted from uploading
     */
    isUserRestricted(userId: string): boolean;
    /**
     * Record a violation for a user
     */
    recordViolation(userId: string, _reason: string): void;
    /**
     * Get upload history for a user
     */
    getUserUploadHistory(userId: string, limit?: number): UploadAuditEntry[];
    /**
     * Restrict a user from uploading
     */
    restrictUser(userId: string): void;
    /**
     * Unrestrict a user (admin action)
     */
    unrestrictUser(userId: string): void;
    /**
     * Clear all violations (admin action)
     */
    clearViolations(userId?: string): void;
    /**
     * Get all current violations
     */
    getAllViolations(): ViolationRecord[];
}
export declare const uploadAuditService: UploadAuditService;
export default uploadAuditService;
//# sourceMappingURL=uploadAudit.d.ts.map