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
 * Violation threshold before restricting user
 */
const VIOLATION_THRESHOLD = 5;
/**
 * Upload Audit Service - singleton
 * Logs all upload attempts, tracks violations, and enforces restrictions
 */
export class UploadAuditService {
    auditLog = [];
    violations = new Map();
    static _instance = null;
    constructor() {
        // Private constructor for singleton
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!UploadAuditService._instance) {
            UploadAuditService._instance = new UploadAuditService();
        }
        return UploadAuditService._instance;
    }
    /**
     * Log an upload attempt
     */
    logUpload(entry) {
        const auditEntry = {
            ...entry,
            timestamp: new Date(),
        };
        this.auditLog.push(auditEntry);
        // Keep log size bounded (last 10000 entries)
        if (this.auditLog.length > 10000) {
            this.auditLog = this.auditLog.slice(-5000);
        }
    }
    /**
     * Get violation count for a user
     */
    getViolationCount(userId) {
        const record = this.violations.get(userId);
        return record ? record.count : 0;
    }
    /**
     * Check if a user is restricted from uploading
     */
    isUserRestricted(userId) {
        const record = this.violations.get(userId);
        return record ? record.restricted : false;
    }
    /**
     * Record a violation for a user
     */
    recordViolation(userId, _reason) {
        const existing = this.violations.get(userId);
        const now = new Date();
        if (existing) {
            existing.count += 1;
            existing.lastViolation = now;
            // Auto-restrict after threshold
            if (existing.count >= VIOLATION_THRESHOLD && !existing.restricted) {
                existing.restricted = true;
            }
        }
        else {
            this.violations.set(userId, {
                userId,
                count: 1,
                lastViolation: now,
                restricted: false,
            });
        }
    }
    /**
     * Get upload history for a user
     */
    getUserUploadHistory(userId, limit = 50) {
        return this.auditLog
            .filter(entry => entry.userId === userId)
            .slice(-limit)
            .reverse();
    }
    /**
     * Restrict a user from uploading
     */
    restrictUser(userId) {
        const existing = this.violations.get(userId);
        if (existing) {
            existing.restricted = true;
        }
        else {
            this.violations.set(userId, {
                userId,
                count: 0,
                lastViolation: new Date(),
                restricted: true,
            });
        }
    }
    /**
     * Unrestrict a user (admin action)
     */
    unrestrictUser(userId) {
        const existing = this.violations.get(userId);
        if (existing) {
            existing.restricted = false;
            existing.count = 0;
        }
    }
    /**
     * Clear all violations (admin action)
     */
    clearViolations(userId) {
        if (userId) {
            this.violations.delete(userId);
        }
        else {
            this.violations.clear();
        }
    }
    /**
     * Get all current violations
     */
    getAllViolations() {
        return Array.from(this.violations.values());
    }
}
// Singleton export
export const uploadAuditService = UploadAuditService.getInstance();
export default uploadAuditService;
//# sourceMappingURL=uploadAudit.js.map