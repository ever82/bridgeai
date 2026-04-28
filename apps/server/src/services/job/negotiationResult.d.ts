/**
 * Negotiation Result Service
 * 协商结果处理服务
 */
import { NegotiationRoom, NegotiationStatus, NegotiationTopic } from '../../models/NegotiationRoom';
export interface NegotiationResult {
    roomId: string;
    status: NegotiationStatus;
    agreedAmount?: number;
    agreedBenefits: string[];
    currency: string;
    agreedByJobSeeker: boolean;
    agreedByEmployer: boolean;
    agreementTimestamp?: Date;
    finalRound: number;
    totalRounds: number;
    duration: number;
}
export interface AgreementConfirmation {
    roomId: string;
    party: 'jobseeker' | 'employer';
    confirmed: boolean;
    confirmedAt: Date;
    conditions?: string[];
    notes?: string;
}
export interface RejectionReason {
    roomId: string;
    rejectedBy: 'jobseeker' | 'employer';
    reason: string;
    rejectedAt: Date;
    alternativeProposed?: boolean;
    alternativeAmount?: number;
}
export interface NegotiationExport {
    roomId: string;
    exportType: 'pdf' | 'json' | 'csv';
    exportedAt: Date;
    data: string;
    summary: string;
}
export declare class NegotiationResultService {
    /**
     * Confirm agreement from one party
     */
    confirmAgreement(roomId: string, party: 'jobseeker' | 'employer', conditions?: string[], notes?: string): Promise<AgreementConfirmation>;
    /**
     * Check if both parties have agreed
     */
    checkMutualAgreement(roomId: string): Promise<{
        agreed: boolean;
        jobseekerConfirmed: boolean;
        employerConfirmed: boolean;
    }>;
    /**
     * Finalize negotiation with agreement
     */
    finalizeAgreement(roomId: string, agreedAmount: number, agreedBenefits: string[]): Promise<NegotiationResult>;
    /**
     * Record rejection
     */
    recordRejection(roomId: string, rejectedBy: 'jobseeker' | 'employer', reason: string, alternativeProposed?: boolean, alternativeAmount?: number): Promise<RejectionReason>;
    /**
     * Get negotiation result
     */
    getResult(roomId: string): Promise<NegotiationResult | null>;
    /**
     * Export negotiation history
     */
    exportNegotiation(roomId: string, exportType: 'pdf' | 'json' | 'csv'): Promise<NegotiationExport>;
    /**
     * Get rejection reasons for a room
     */
    getRejectionReasons(roomId: string): Promise<RejectionReason[]>;
    /**
     * Get all confirmations for a room
     */
    getConfirmations(roomId: string): Promise<AgreementConfirmation[]>;
    /**
     * Cancel negotiation
     */
    cancelNegotiation(roomId: string, reason?: string): Promise<NegotiationRoom | null>;
    /**
     * Check if agreement conditions are met
     */
    checkAgreementConditions(roomId: string): Promise<{
        conditionsMet: boolean;
        pendingConditions: string[];
        jobseekerConditions: string[];
        employerConditions: string[];
    }>;
    /**
     * Get negotiation statistics
     */
    getStatistics(roomId: string): Promise<{
        totalMessages: number;
        messagesBySender: Record<string, number>;
        averageResponseTime: number;
        offerProgression: number[];
        topicsDiscussed: NegotiationTopic[];
    } | null>;
    private convertToCSV;
    private convertToText;
}
export declare const negotiationResultService: NegotiationResultService;
//# sourceMappingURL=negotiationResult.d.ts.map