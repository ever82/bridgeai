export interface EmailMessage {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  cid?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface EmailAdapter {
  name: string;
  send(message: EmailMessage): Promise<EmailResult>;
  sendBatch(messages: EmailMessage[]): Promise<EmailResult[]>;
  verifyConnection(): Promise<boolean>;
}