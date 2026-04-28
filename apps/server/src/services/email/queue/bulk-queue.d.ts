import { EmailProviderManager, EmailMessage } from '../adapters';
export interface BulkEmailJob {
    id: string;
    campaignId: string;
    message: EmailMessage;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
    processedAt?: Date;
    error?: string;
}
export interface BulkCampaign {
    id: string;
    name: string;
    totalEmails: number;
    sentEmails: number;
    failedEmails: number;
    status: 'pending' | 'processing' | 'paused' | 'completed' | 'cancelled';
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}
export interface RateLimitConfig {
    emailsPerSecond: number;
    emailsPerMinute?: number;
    emailsPerHour?: number;
}
export declare class BulkEmailQueue {
    private jobs;
    private campaigns;
    private providerManager;
    private rateLimit;
    private isProcessing;
    private isPaused;
    private processingInterval?;
    constructor(providerManager: EmailProviderManager, rateLimit: RateLimitConfig);
    createCampaign(name: string, messages: EmailMessage[]): Promise<string>;
    startCampaign(campaignId: string): Promise<void>;
    pauseCampaign(campaignId: string): void;
    resumeCampaign(campaignId: string): void;
    cancelCampaign(campaignId: string): void;
    getCampaignStatus(campaignId: string): BulkCampaign | null;
    private startProcessing;
    private processJob;
    private updateCampaignStats;
    private checkCampaignCompletion;
    private stopProcessing;
    shutdown(): void;
}
//# sourceMappingURL=bulk-queue.d.ts.map