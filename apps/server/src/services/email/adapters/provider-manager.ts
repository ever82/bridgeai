import { EmailAdapter, EmailMessage, EmailResult } from './base.interface';
import { SmtpEmailAdapter, SmtpConfig } from './smtp.adapter';
import { SendGridEmailAdapter, SendGridConfig } from './sendgrid.adapter';
import { SesEmailAdapter, SesConfig } from './ses.adapter';
import { FailoverEmailAdapter } from './failover.adapter';

export type ProviderConfig = {
  type: 'smtp';
  config: SmtpConfig;
} | {
  type: 'sendgrid';
  config: SendGridConfig;
} | {
  type: 'ses';
  config: SesConfig;
};

export class EmailProviderManager {
  private adapter: EmailAdapter;
  private primaryProvider: string;

  constructor(providers: ProviderConfig[], enableFailover = true) {
    if (providers.length === 0) {
      throw new Error('At least one email provider must be configured');
    }

    const adapters = providers.map((p) => this.createAdapter(p));
    this.primaryProvider = providers[0].type;

    this.adapter = enableFailover && providers.length > 1
      ? new FailoverEmailAdapter(adapters)
      : adapters[0];
  }

  private createAdapter(provider: ProviderConfig): EmailAdapter {
    switch (provider.type) {
      case 'smtp':
        return new SmtpEmailAdapter(provider.config);
      case 'sendgrid':
        return new SendGridEmailAdapter(provider.config);
      case 'ses':
        return new SesEmailAdapter(provider.config);
      default:
        throw new Error(`Unknown provider type: ${(provider as ProviderConfig).type}`);
    }
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    return this.adapter.send(message);
  }

  async sendBatch(messages: EmailMessage[]): Promise<EmailResult[]> {
    return this.adapter.sendBatch(messages);
  }

  async verifyConnection(): Promise<boolean> {
    return this.adapter.verifyConnection();
  }

  getPrimaryProvider(): string {
    return this.primaryProvider;
  }
}