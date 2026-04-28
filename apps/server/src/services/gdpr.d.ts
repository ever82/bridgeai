export interface DataDeletionRequest {
    userId: string;
    reason: 'user_request' | 'data_retention' | 'legal_requirement' | 'fraud';
    verificationMethod: 'email' | 'sms' | 'mfa';
    verified: boolean;
    deleteOptions?: {
        keepTransactions?: boolean;
        anonymizeInstead?: boolean;
        gracePeriodDays?: number;
    };
}
export interface DataDeletionResult {
    deletionId: string;
    userId: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    requestedAt: Date;
    scheduledAt?: Date;
    completedAt?: Date;
    itemsDeleted: number;
    itemsAnonymized: number;
    proofOfDeletion?: string;
}
export interface GDPRRequest {
    userId: string;
    type: 'access' | 'deletion' | 'portability' | 'rectification' | 'restriction';
    details: Record<string, any>;
}
declare class GDPRService {
    private deletionLog;
    private pendingDeletions;
    requestDataDeletion(request: DataDeletionRequest): Promise<DataDeletionResult>;
    private executeDeletion;
    private deleteUserData;
    private anonymizeUserData;
    private generateProofOfDeletion;
    cancelDeletion(deletionId: string): Promise<boolean>;
    processGDPRRequest(request: GDPRRequest): Promise<Record<string, any>>;
    private handleAccessRequest;
    private handlePortabilityRequest;
    private handleRectificationRequest;
    private handleRestrictionRequest;
    private logGDPRRequest;
    getDeletionStatus(deletionId: string): DataDeletionResult | undefined;
    getUserDeletionHistory(userId: string): DataDeletionResult[];
}
export declare const gdprService: GDPRService;
export {};
//# sourceMappingURL=gdpr.d.ts.map