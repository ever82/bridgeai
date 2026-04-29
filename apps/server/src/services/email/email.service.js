import { EmailProviderManager } from './adapters';
import { TemplateStore } from './templates';
import { TransactionalEmailService } from './transactional.service';
import { BulkEmailQueue } from './queue/bulk-queue';
import { EmailTrackingService } from './tracking/tracking.service';
export class EmailService {
    providerManager;
    templateStore;
    transactionalService;
    bulkQueue;
    trackingService;
    constructor(config) {
        this.providerManager = new EmailProviderManager(config.providers, config.enableFailover);
        this.templateStore = new TemplateStore();
        this.transactionalService = new TransactionalEmailService(this.providerManager, this.templateStore);
        this.bulkQueue = new BulkEmailQueue(this.providerManager, config.rateLimit);
        this.trackingService = new EmailTrackingService();
    }
    getTransactionalService() {
        return this.transactionalService;
    }
    getBulkQueue() {
        return this.bulkQueue;
    }
    getTrackingService() {
        return this.trackingService;
    }
    getTemplateStore() {
        return this.templateStore;
    }
    async send(message) {
        if (!message.to) {
            return { success: false, error: 'Recipient is required' };
        }
        const emailToCheck = Array.isArray(message.to) ? message.to[0] : message.to;
        const isReputable = await this.trackingService.isReputable(emailToCheck);
        if (!isReputable) {
            return { success: false, error: 'Recipient has poor reputation' };
        }
        const trackingHtml = message.trackOpens
            ? (message.html || '') + this.trackingService.generateTrackingPixel(`track_${Date.now()}`)
            : message.html;
        const messageWithTracking = {
            ...message,
            html: trackingHtml,
        };
        const result = await this.providerManager.send(messageWithTracking);
        if (result.success && result.messageId) {
            await this.trackingService.recordSent(result.messageId, emailToCheck);
        }
        return {
            success: result.success,
            messageId: result.messageId,
            error: result.error,
        };
    }
    async sendBatch(messages) {
        const results = await Promise.all(messages.map((msg) => this.send(msg)));
        return {
            success: results.every((r) => r.success),
            results: results.map((r) => ({ messageId: r.messageId, error: r.error })),
        };
    }
    async verifyConnection() {
        return this.providerManager.verifyConnection();
    }
}
//# sourceMappingURL=email.service.js.map