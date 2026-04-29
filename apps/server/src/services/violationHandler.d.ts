/**
 * Violation Handler Service
 * Manages user violations, applies punitive actions (mute/ban/suspend),
 * links violations to credit score deduction, and sends user warnings.
 */
import { ViolationType, ViolationAction, UserViolation } from '@prisma/client';
export interface ViolationRecord {
    type: ViolationType;
    severity: number;
    description?: string;
    reportId?: string;
    moderatorId?: string;
}
export interface ViolationResult {
    success: boolean;
    violation?: UserViolation;
    action?: ViolationAction;
    creditDeducted?: number;
    notificationSent?: boolean;
    error?: string;
}
export interface ViolationCheck {
    activeViolationCount: number;
    totalViolationCount: number;
    recentViolations: UserViolation[];
    shouldEscalate: boolean;
}
/**
 * Violation Handler Service
 */
export declare class ViolationHandler {
    /**
     * Records a new violation for a user
     */
    recordViolation(userId: string, data: ViolationRecord, action?: ViolationAction): Promise<UserViolation>;
    /**
     * Applies a punitive action to a user
     */
    applyAction(userId: string, action: ViolationAction, moderatorId?: string): Promise<void>;
    /**
     * Sends a warning notification to the user
     */
    sendWarning(userId: string, violation: UserViolation, reason?: string): Promise<void>;
    /**
     * Mutes a user temporarily
     */
    muteUser(userId: string, durationHours?: number): Promise<void>;
    /**
     * Bans a user permanently or temporarily suspends
     */
    banUser(userId: string, isPermanent?: boolean, until?: Date): Promise<void>;
    /**
     * Checks a user's active violation count
     */
    checkActiveViolationCount(userId: string): Promise<number>;
    /**
     * Gets detailed violation check for a user
     */
    checkActiveViolations(userId: string): Promise<ViolationCheck>;
    /**
     * Links a violation to credit score deduction
     */
    linkToCreditScore(userId: string, severity: number, violationId?: string): Promise<{
        deducted: number;
        newScore: number;
    }>;
    /**
     * Main entry point: handles a complete violation workflow
     * Records violation, applies action, links credit score, and sends notification
     */
    handleViolation(userId: string, data: ViolationRecord, options?: {
        notifyUser?: boolean;
        creditDeduct?: boolean;
        moderatorId?: string;
    }): Promise<ViolationResult>;
    /**
     * Lifts a temporary action (mute/suspend) early
     */
    liftAction(userId: string, moderatorId?: string): Promise<boolean>;
    /**
     * Gets all violations for a user
     */
    getUserViolations(userId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        violations: UserViolation[];
        total: number;
    }>;
}
export declare const violationHandler: ViolationHandler;
//# sourceMappingURL=violationHandler.d.ts.map