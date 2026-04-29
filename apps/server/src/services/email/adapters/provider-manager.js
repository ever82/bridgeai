import { SmtpEmailAdapter } from './smtp.adapter';
import { SendGridEmailAdapter } from './sendgrid.adapter';
import { SesEmailAdapter } from './ses.adapter';
import { FailoverEmailAdapter } from './failover.adapter';
export class EmailProviderManager {
    adapter;
    primaryProvider;
    constructor(providers, enableFailover = true) {
        if (providers.length === 0) {
            throw new Error('At least one email provider must be configured');
        }
        const adapters = providers.map((p) => this.createAdapter(p));
        this.primaryProvider = providers[0].type;
        this.adapter = enableFailover && providers.length > 1
            ? new FailoverEmailAdapter(adapters)
            : adapters[0];
    }
    createAdapter(provider) {
        switch (provider.type) {
            case 'smtp':
                return new SmtpEmailAdapter(provider.config);
            case 'sendgrid':
                return new SendGridEmailAdapter(provider.config);
            case 'ses':
                return new SesEmailAdapter(provider.config);
            default:
                throw new Error(`Unknown provider type: ${provider.type}`);
        }
    }
    async send(message) {
        return this.adapter.send(message);
    }
    async sendBatch(messages) {
        return this.adapter.sendBatch(messages);
    }
    async verifyConnection() {
        return this.adapter.verifyConnection();
    }
    getPrimaryProvider() {
        return this.primaryProvider;
    }
}
//# sourceMappingURL=provider-manager.js.map