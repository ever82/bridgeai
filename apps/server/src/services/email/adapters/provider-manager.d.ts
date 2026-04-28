import { EmailMessage, EmailResult } from './base.interface';
import { SmtpConfig } from './smtp.adapter';
import { SendGridConfig } from './sendgrid.adapter';
import { SesConfig } from './ses.adapter';
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
export declare class EmailProviderManager {
    private adapter;
    private primaryProvider;
    constructor(providers: ProviderConfig[], enableFailover?: boolean);
    private createAdapter;
    send(message: EmailMessage): Promise<EmailResult>;
    sendBatch(messages: EmailMessage[]): Promise<EmailResult[]>;
    verifyConnection(): Promise<boolean>;
    getPrimaryProvider(): string;
}
//# sourceMappingURL=provider-manager.d.ts.map