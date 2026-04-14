import { EmailAdapter, EmailMessage, EmailResult } from './base.interface';

export interface SendGridConfig {
  apiKey: string;
  from?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SendGridModule = any;

export class SendGridEmailAdapter implements EmailAdapter {
  name = 'sendgrid';
  private config: SendGridConfig;
  private defaultFrom: string;

  constructor(config: SendGridConfig) {
    this.config = config;
    this.defaultFrom = config.from || 'noreply@bridgeai.com';
  }

  private async getSendGrid(): Promise<SendGridModule | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('@sendgrid/mail');
    } catch {
      return null;
    }
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const sgMail = await this.getSendGrid();
      if (!sgMail) {
        return {
          success: false,
          error: '@sendgrid/mail not installed',
          provider: this.name,
        };
      }

      sgMail.setApiKey(this.config.apiKey);

      const msg = {
        to: Array.isArray(message.to) ? message.to : [message.to],
        from: message.from || this.defaultFrom,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content.toString('base64'),
          type: att.contentType,
          disposition: 'attachment',
          contentId: att.cid,
        })),
        trackingSettings: {
          openClick: {
            enable: message.trackOpens || message.trackClicks || false,
          },
        },
      };

      const [response] = await sgMail.send(msg);

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string || '',
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
    const batch = messages.map((msg) => ({
      to: Array.isArray(msg.to) ? msg.to : [msg.to],
      from: msg.from || this.defaultFrom,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }));

    try {
      const sgMail = await this.getSendGrid();
      if (!sgMail) {
        return [{
          success: false,
          error: '@sendgrid/mail not installed',
          provider: this.name,
        }];
      }

      sgMail.setApiKey(this.config.apiKey);
      const responses = await sgMail.send(batch);
      return responses.map((resp: { headers: { 'x-message-id'?: string } }, i: number) => ({
        success: true,
        messageId: resp.headers['x-message-id'] as string || `batch-${i}`,
        provider: this.name,
      }));
    } catch (error) {
      return [{
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      }];
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const sgMail = await this.getSendGrid();
      if (!sgMail) return false;

      sgMail.setApiKey(this.config.apiKey);
      await sgMail.send([{
        to: 'test@example.com',
        from: this.defaultFrom,
        subject: 'Connection Test',
        text: 'Test',
      }]);
      return true;
    } catch {
      return false;
    }
  }
}