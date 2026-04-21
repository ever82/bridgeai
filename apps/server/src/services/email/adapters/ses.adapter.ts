import { EmailAdapter, EmailMessage, EmailResult } from './base.interface';

export interface SesConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  from?: string;
}

export class SesEmailAdapter implements EmailAdapter {
  name = 'ses';
  private config: SesConfig;
  private defaultFrom: string;

  constructor(config: SesConfig) {
    this.config = config;
    this.defaultFrom = config.from || 'noreply@bridgeai.com';
  }

  private async getClient() {
    const module = await import('@aws-sdk/client-ses').catch(() => null);
    if (!module || !module.default) {
      // Try named exports if default is not available
      const SESClient = (module as any)?.SESClient;
      const SendEmailCommand = (module as any)?.SendEmailCommand;
      if (!SESClient || !SendEmailCommand) {
        return null;
      }
      return { SESClient, SendEmailCommand };
    }
    // Use default export's SESClient and SendEmailCommand
    const SESClient = module.default.SESClient;
    const SendEmailCommand = module.default.SendEmailCommand;
    if (!SESClient || !SendEmailCommand) {
      return null;
    }
    return { SESClient, SendEmailCommand };
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const clientModule = await this.getClient();
      if (!clientModule) {
        return {
          success: false,
          error: '@aws-sdk/client-ses not installed',
          provider: this.name,
        };
      }

      const { SESClient, SendEmailCommand } = clientModule as any;
      const client = new SESClient({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      });

      const command = new SendEmailCommand({
        Source: message.from || this.defaultFrom,
        Destination: {
          ToAddresses: Array.isArray(message.to) ? message.to : [message.to],
        },
        Message: {
          Subject: {
            Data: message.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: message.html ? { Data: message.html, Charset: 'UTF-8' } : undefined,
            Text: message.text ? { Data: message.text, Charset: 'UTF-8' } : undefined,
          },
        },
      });

      const response = await client.send(command);

      return {
        success: true,
        messageId: response.MessageId || '',
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  async sendBatch(messages: EmailMessage[]): Promise<EmailResult[]> {
    return Promise.all(messages.map((msg) => this.send(msg)));
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const clientModule = await this.getClient();
      if (!clientModule) return false;

      const { SESClient, SendEmailCommand } = clientModule;
      const client = new SESClient({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      });

      const command = new SendEmailCommand({
        Source: this.defaultFrom,
        Destination: {
          ToAddresses: ['verify@example.com'],
        },
        Message: {
          Subject: { Data: 'Verification Test', Charset: 'UTF-8' },
          Body: { Text: { Data: 'Test', Charset: 'UTF-8' } },
        },
      });
      await client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}