import { EmailAdapter, EmailMessage, EmailResult } from './base.interface';

export class FailoverEmailAdapter implements EmailAdapter {
  name = 'failover';
  private adapters: EmailAdapter[];

  constructor(adapters: EmailAdapter[]) {
    this.adapters = adapters;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    const results: EmailResult[] = [];

    for (const adapter of this.adapters) {
      const result = await adapter.send(message);
      results.push(result);

      if (result.success) {
        return result;
      }
    }

    return {
      success: false,
      error: `All adapters failed. Errors: ${results.map((r) => r.error).join('; ')}`,
      provider: this.name,
    };
  }

  async sendBatch(messages: EmailMessage[]): Promise<EmailResult[]> {
    const allResults: EmailResult[] = [];

    for (const message of messages) {
      const result = await this.send(message);
      allResults.push(result);
    }

    return allResults;
  }

  async verifyConnection(): Promise<boolean> {
    for (const adapter of this.adapters) {
      if (await adapter.verifyConnection()) {
        return true;
      }
    }
    return false;
  }
}