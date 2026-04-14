import { EmailProviderManager, ProviderConfig } from './adapters';
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

export class EmailService {
  private providerManager: EmailProviderManager;
  private templateStore: TemplateStore;
  private transactionalService: TransactionalEmailService;
  private bulkQueue: BulkEmailQueue;
  private trackingService: EmailTrackingService;

  constructor(config: EmailServiceConfig) {
    this.providerManager = new EmailProviderManager(config.providers, config.enableFailover);
    this.templateStore = new TemplateStore();
    this.transactionalService = new TransactionalEmailService(this.providerManager, this.templateStore);
    this.bulkQueue = new BulkEmailQueue(this.providerManager, config.rateLimit);
    this.trackingService = new EmailTrackingService();
  }

  getTransactionalService(): TransactionalEmailService {
    return this.transactionalService;
  }

  getBulkQueue(): BulkEmailQueue {
    return this.bulkQueue;
  }

  getTrackingService(): EmailTrackingService {
    return this.trackingService;
  }

  getTemplateStore(): TemplateStore {
    return this.templateStore;
  }

  async send(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
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

    const messageWithTracking: EmailMessage = {
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

  async sendBatch(messages: EmailMessage[]): Promise<{ success: boolean; results: { messageId?: string; error?: string }[] }> {
    const results = await Promise.all(
      messages.map((msg) => this.send(msg))
    );

    return {
      success: results.every((r) => r.success),
      results: results.map((r) => ({ messageId: r.messageId, error: r.error })),
    };
  }

  async verifyConnection(): Promise<boolean> {
    return this.providerManager.verifyConnection();
  }
}