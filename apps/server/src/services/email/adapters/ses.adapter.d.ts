import { EmailAdapter, EmailMessage, EmailResult } from './base.interface';
export interface SesConfig {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    from?: string;
}
export declare class SesEmailAdapter implements EmailAdapter {
    name: string;
    private config;
    private defaultFrom;
    constructor(config: SesConfig);
    private getClient;
    send(message: EmailMessage): Promise<EmailResult>;
    sendBatch(messages: EmailMessage[]): Promise<EmailResult[]>;
    verifyConnection(): Promise<boolean>;
}
//# sourceMappingURL=ses.adapter.d.ts.map