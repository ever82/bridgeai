export interface EmailTrackingRecord {
    messageId: string;
    to: string;
    sentAt: Date;
    openedAt?: Date;
    clickedUrls: {
        url: string;
        clickedAt: Date;
    }[];
    bounced: boolean;
    bouncedAt?: Date;
    bouncedReason?: string;
    complained: boolean;
    complainedAt?: Date;
}
export interface ReputationEntry {
    email: string;
    reputation: 'good' | 'neutral' | 'poor' | 'bounced';
    score: number;
    lastUpdated: Date;
    bounceCount: number;
    complaintCount: number;
}
export declare class EmailTrackingService {
    private trackingRecords;
    private reputationList;
    recordSent(messageId: string, to: string): Promise<void>;
    recordOpen(messageId: string): Promise<void>;
    recordClick(messageId: string, url: string): Promise<void>;
    recordBounce(messageId: string, reason: string): Promise<void>;
    recordComplaint(messageId: string): Promise<void>;
    getTrackingRecord(messageId: string): Promise<EmailTrackingRecord | null>;
    getEmailStats(email: string): Promise<{
        sent: number;
        opened: number;
        clicked: number;
        bounced: number;
    }>;
    updateReputation(email: string, event: 'bounce' | 'complaint'): Promise<void>;
    getReputation(email: string): Promise<ReputationEntry | null>;
    isReputable(email: string): Promise<boolean>;
    generateTrackingPixel(messageId: string): string;
    generateClickTrackingUrl(messageId: string, originalUrl: string): string;
}
//# sourceMappingURL=tracking.service.d.ts.map