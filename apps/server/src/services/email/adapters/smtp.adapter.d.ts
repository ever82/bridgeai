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
export declare class SmtpEmailAdapter implements EmailAdapter {
    name: string;
    private config;
    private defaultFrom;
    constructor(config: SmtpConfig);
    private getNodemailer;
    send(message: EmailMessage): Promise<EmailResult>;
    sendBatch(messages: EmailMessage[]): Promise<EmailResult[]>;
    verifyConnection(): Promise<boolean>;
}
//# sourceMappingURL=smtp.adapter.d.ts.map