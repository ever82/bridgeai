import { EmailAdapter, EmailMessage, EmailResult } from './base.interface';
export interface SendGridConfig {
    apiKey: string;
    from?: string;
}
export declare class SendGridEmailAdapter implements EmailAdapter {
    name: string;
    private config;
    private defaultFrom;
    constructor(config: SendGridConfig);
    private getSendGrid;
    send(message: EmailMessage): Promise<EmailResult>;
    sendBatch(messages: EmailMessage[]): Promise<EmailResult[]>;
    verifyConnection(): Promise<boolean>;
}
//# sourceMappingURL=sendgrid.adapter.d.ts.map