import { EmailAdapter, EmailMessage, EmailResult } from './base.interface';
export declare class FailoverEmailAdapter implements EmailAdapter {
    name: string;
    private adapters;
    constructor(adapters: EmailAdapter[]);
    send(message: EmailMessage): Promise<EmailResult>;
    sendBatch(messages: EmailMessage[]): Promise<EmailResult[]>;
    verifyConnection(): Promise<boolean>;
}
//# sourceMappingURL=failover.adapter.d.ts.map