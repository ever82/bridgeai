export class FailoverEmailAdapter {
    name = 'failover';
    adapters;
    constructor(adapters) {
        this.adapters = adapters;
    }
    async send(message) {
        const results = [];
        for (const adapter of this.adapters) {
            const result = await adapter.send(message);
            results.push(result);
            if (result.success) {
                return result;
            }
        }
        return {
            success: false,
            error: `All adapters failed. Errors: ${results.map((r) => r.error).join('; ')}`,
            provider: this.name,
        };
    }
    async sendBatch(messages) {
        const allResults = [];
        for (const message of messages) {
            const result = await this.send(message);
            allResults.push(result);
        }
        return allResults;
    }
    async verifyConnection() {
        for (const adapter of this.adapters) {
            if (await adapter.verifyConnection()) {
                return true;
            }
        }
        return false;
    }
}
//# sourceMappingURL=failover.adapter.js.map