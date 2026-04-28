import { ProviderConfig } from './adapters';
import { TemplateStore } from './templates';
import { TransactionalEmailService } from './transactional.service';
import { BulkEmailQueue, RateLimitConfig } from './queue/bulk-queue';
import { EmailTrackingService } from './tracking/tracking.service';
import { EmailMessage } from './adapters/base.interface';
export interface EmailServiceConfig {
    providers: ProviderConfig[];
    enableFailover: boolean;
    rateLimit: RateLimitConfig;
}
export declare class EmailService {
    private providerManager;
    private templateStore;
    private transactionalService;
    private bulkQueue;
    private trackingService;
    constructor(config: EmailServiceConfig);
    getTransactionalService(): TransactionalEmailService;
    getBulkQueue(): BulkEmailQueue;
    getTrackingService(): EmailTrackingService;
    getTemplateStore(): TemplateStore;
    send(message: EmailMessage): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
    sendBatch(messages: EmailMessage[]): Promise<{
        success: boolean;
        results: {
            messageId?: string;
            error?: string;
        }[];
    }>;
    verifyConnection(): Promise<boolean>;
}
//# sourceMappingURL=email.service.d.ts.map