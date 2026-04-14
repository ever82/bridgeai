import { EmailAdapter, EmailMessage, EmailResult } from './base.interface';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NodemailerModule = any;

export class SmtpEmailAdapter implements EmailAdapter {
  name = 'smtp';
  private config: SmtpConfig;
  private defaultFrom: string;

  constructor(config: SmtpConfig) {
    this.config = config;
    this.defaultFrom = config.from || 'noreply@bridgeai.com';
  }

  private async getNodemailer(): Promise<NodemailerModule | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('nodemailer');
    } catch {
      return null;
    }
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const nodemailer = await this.getNodemailer();
      if (!nodemailer) {
        return {
          success: false,
          error: 'nodemailer not installed',
          provider: this.name,
        };
      }

      const transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
      });

      const info = await transporter.sendMail({
        from: message.from || this.defaultFrom,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments,
        headers: message.headers,
      });

      return {
        success: true,
        messageId: info.messageId,
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
      const nodemailer = await this.getNodemailer();
      if (!nodemailer) return false;

      const transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
      });
      await transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}