/**
 * Company Verification Service
 *
 * Handles company email verification and business license verification
 */
import { type EmployerVerification, type EmployerVerificationResponse } from '@bridgeai/shared';
export interface VerificationOptions {
    sendEmail?: boolean;
}
/**
 * Request email verification
 */
export declare function requestEmailVerification(employerProfileId: string, email: string, options?: VerificationOptions): Promise<{
    token: string;
    expiresAt: Date;
}>;
/**
 * Verify email with token
 */
export declare function verifyEmail(token: string): Promise<EmployerVerificationResponse>;
/**
 * Submit business license for verification
 */
export declare function submitBusinessVerification(employerProfileId: string, userId: string, businessLicenseUrl: string, businessRegistrationNumber: string): Promise<EmployerVerificationResponse>;
/**
 * Approve business verification (admin only)
 */
export declare function approveBusinessVerification(employerProfileId: string, adminId: string): Promise<EmployerVerificationResponse>;
/**
 * Reject business verification (admin only)
 */
export declare function rejectBusinessVerification(employerProfileId: string, adminId: string, reason: string): Promise<EmployerVerificationResponse>;
/**
 * Get verification status
 */
export declare function getVerificationStatus(employerProfileId: string, userId: string): Promise<EmployerVerification>;
/**
 * Calculate verification score for employer profile
 */
export declare function calculateVerificationScore(verification: EmployerVerification): number;
/**
 * Check if employer is fully verified
 */
export declare function isFullyVerified(verification: EmployerVerification): boolean;
/**
 * Check if employer can post jobs
 */
export declare function canPostJobs(verification: EmployerVerification): boolean;
/**
 * Get verification badge info
 */
export declare function getVerificationBadge(verification: EmployerVerification): {
    type: 'none' | 'email' | 'business';
    label: string;
    color: string;
};
//# sourceMappingURL=companyVerification.d.ts.map