/**
 * Resume Delivery Service
 *
 * Handles resume delivery to jobs, status tracking, history,
 * and batch delivery management.
 */
import { type ResumeDelivery, type DeliveryHistoryEntry, type DeliveryStats, type DeliveryFilterOptions, type DeliveryListResponse, type BatchDeliveryResult, DeliveryStatus } from '@bridgeai/shared';
export interface DeliveryBatch {
    resumeId: string;
    jobId: string;
    seekerId: string;
    seekerAgentId: string;
    employerId: string;
    employerAgentId: string;
    createdAt: string;
    cooldownUntil?: string;
}
/**
 * Check if a delivery already exists (prevent duplicate)
 */
export declare function checkDuplicateDelivery(resumeId: string, jobId: string, seekerId: string): Promise<ResumeDelivery | null>;
/**
 * Create a new resume delivery
 */
export declare function createDelivery(resumeId: string, jobId: string, seekerId: string, seekerAgentId: string, coverLetter?: string, customAnswers?: Record<string, string>, referralCode?: string): Promise<ResumeDelivery>;
/**
 * Get delivery by ID
 */
export declare function getDelivery(deliveryId: string): Promise<ResumeDelivery>;
/**
 * Get delivery for seeker (with masked data based on visibility)
 */
export declare function getDeliveryForSeeker(deliveryId: string, seekerId: string): Promise<ResumeDelivery>;
/**
 * Get delivery for employer (with disclosure data)
 */
export declare function getDeliveryForEmployer(deliveryId: string, employerId: string): Promise<ResumeDelivery & {
    disclosures: {
        field: string;
        value: string;
    }[];
}>;
/**
 * Update delivery status
 */
export declare function updateDeliveryStatus(deliveryId: string, actorId: string, actorType: 'SEEKER' | 'EMPLOYER' | 'SYSTEM', newStatus: DeliveryStatus, reason?: string): Promise<ResumeDelivery>;
/**
 * Withdraw a delivery
 */
export declare function withdrawDelivery(deliveryId: string, seekerId: string, reason?: string): Promise<ResumeDelivery>;
/**
 * List deliveries for a seeker
 */
export declare function listDeliveriesForSeeker(seekerId: string, filter?: DeliveryFilterOptions): Promise<DeliveryListResponse>;
/**
 * List deliveries for an employer (received applications)
 */
export declare function listDeliveriesForEmployer(employerId: string, filter?: DeliveryFilterOptions): Promise<DeliveryListResponse>;
/**
 * Get delivery history
 */
export declare function getDeliveryHistory(deliveryId: string): Promise<DeliveryHistoryEntry[]>;
/**
 * Get delivery statistics for a seeker
 */
export declare function getSeekerDeliveryStats(seekerId: string): Promise<DeliveryStats>;
/**
 * Get delivery statistics for an employer
 */
export declare function getEmployerDeliveryStats(employerId: string): Promise<DeliveryStats>;
/**
 * Batch deliver resume to multiple jobs
 */
export declare function batchDeliver(resumeId: string, jobIds: string[], seekerId: string, seekerAgentId: string, coverLetter?: string): Promise<BatchDeliveryResult[]>;
/**
 * Notify seeker of disclosure change
 */
export declare function notifyDisclosureChange(deliveryId: string, seekerId: string, changedFields: string[]): Promise<void>;
/**
 * Revoke disclosure for a specific field
 */
export declare function revokeDisclosure(deliveryId: string, seekerId: string, field: string): Promise<void>;
//# sourceMappingURL=deliveryService.d.ts.map