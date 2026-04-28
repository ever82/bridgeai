"use strict";
/**
 * Fallback Strategies Unit Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const strategies_1 = require("../strategies");
// Helper: create a mock ModelInfo
function makeModel(overrides) {
    return {
        name: overrides.id,
        capabilities: { chatCompletion: true, embeddings: false, streaming: true, maxTokens: 4096, supportedLanguages: ['en', 'zh'] },
        costPer1KTokens: { input: 0.01, output: 0.03 },
        averageLatencyMs: 200,
        qualityScore: 80,
        maxContextTokens: 8192,
        ...overrides,
    };
}
// Helper: create a basic chat request
function makeRequest(overrides = {}) {
    return {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        ...overrides,
    };
}
// Helper: create FallbackContext
function makeContext(overrides = {}) {
    const models = new Map();
    models.set('gpt-4', makeModel({ id: 'gpt-4', provider: 'openai', costPer1KTokens: { input: 0.03, output: 0.06 } }));
    models.set('gpt-3.5-turbo', makeModel({ id: 'gpt-3.5-turbo', provider: 'openai', costPer1KTokens: { input: 0.001, output: 0.002 } }));
    models.set('claude-sonnet-4', makeModel({ id: 'claude-sonnet-4', provider: 'claude', costPer1KTokens: { input: 0.003, output: 0.015 }, qualityScore: 90 }));
    return {
        availableProviders: ['openai', 'claude'],
        models,
        attemptCount: 1,
        originalProvider: 'openai',
        ...overrides,
    };
}
// Mock cache for CacheFallbackStrategy tests
class MockCache {
    store = new Map();
    async get(key) {
        return this.store.get(key) || null;
    }
    async set(key, value, _ttlMs) {
        this.store.set(key, value);
    }
    generateKey(request) {
        return `${request.model}:${request.messages.map(m => m.content).join('|')}`;
    }
    // Test helper
    preload(request, response) {
        const key = this.generateKey(request);
        this.store.set(key, response);
    }
}
function makeResponse(overrides = {}) {
    return {
        id: 'resp-123',
        model: 'gpt-4',
        choices: [{
                index: 0,
                message: { role: 'assistant', content: 'Hi there' },
                finishReason: 'stop',
            }],
        usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
        createdAt: new Date(),
        ...overrides,
    };
}
// ---- ModelDowngradeStrategy ----
describe('ModelDowngradeStrategy', () => {
    let strategy;
    beforeEach(() => {
        strategy = new strategies_1.ModelDowngradeStrategy();
    });
    it('should have name "model-downgrade"', () => {
        expect(strategy.name).toBe('model-downgrade');
    });
    it('should downgrade to a cheaper model from the same provider', async () => {
        const result = await strategy.execute(makeRequest(), new Error('fail'), makeContext());
        expect(result.success).toBe(true);
        expect(result.strategy).toBe('model-downgrade');
        expect(result.model).toBe('gpt-3.5-turbo');
        expect(result.provider).toBe('openai');
    });
    it('should fail when current model is not in registry', async () => {
        const result = await strategy.execute(makeRequest({ model: 'unknown-model' }), new Error('fail'), makeContext());
        expect(result.success).toBe(false);
        expect(result.message).toContain('not found');
    });
    it('should fail when no cheaper model is available', async () => {
        const models = new Map();
        models.set('gpt-4', makeModel({ id: 'gpt-4', provider: 'openai', costPer1KTokens: { input: 0.001, output: 0.001 } }));
        const result = await strategy.execute(makeRequest(), new Error('fail'), makeContext({ models }));
        expect(result.success).toBe(false);
        expect(result.message).toContain('No cheaper model');
    });
});
// ---- ProviderSwitchStrategy ----
describe('ProviderSwitchStrategy', () => {
    let strategy;
    beforeEach(() => {
        strategy = new strategies_1.ProviderSwitchStrategy();
    });
    it('should have name "provider-switch"', () => {
        expect(strategy.name).toBe('provider-switch');
    });
    it('should switch to the best model from an alternative provider', async () => {
        const result = await strategy.execute(makeRequest(), new Error('fail'), makeContext());
        expect(result.success).toBe(true);
        expect(result.strategy).toBe('provider-switch');
        expect(result.provider).toBe('claude');
        expect(result.model).toBe('claude-sonnet-4');
    });
    it('should fail when current model is not in registry', async () => {
        const result = await strategy.execute(makeRequest({ model: 'unknown-model' }), new Error('fail'), makeContext());
        expect(result.success).toBe(false);
        expect(result.message).toContain('not found');
    });
    it('should fail when no alternative providers are available', async () => {
        const result = await strategy.execute(makeRequest(), new Error('fail'), makeContext({ availableProviders: ['openai'] }));
        expect(result.success).toBe(false);
        expect(result.message).toContain('No alternative providers');
    });
    it('should fail when alternative providers have no suitable models', async () => {
        const models = new Map();
        models.set('gpt-4', makeModel({ id: 'gpt-4', provider: 'openai' }));
        // claude provider has models but none with chatCompletion
        models.set('claude-nochat', makeModel({ id: 'claude-nochat', provider: 'claude', capabilities: { chatCompletion: false, embeddings: false, streaming: false, maxTokens: 0, supportedLanguages: [] } }));
        const result = await strategy.execute(makeRequest(), new Error('fail'), makeContext({ models }));
        expect(result.success).toBe(false);
        expect(result.message).toContain('No suitable model');
    });
});
// ---- CacheFallbackStrategy ----
describe('CacheFallbackStrategy', () => {
    let strategy;
    beforeEach(() => {
        strategy = new strategies_1.CacheFallbackStrategy();
    });
    it('should have name "cache-fallback"', () => {
        expect(strategy.name).toBe('cache-fallback');
    });
    it('should return cached response when available', async () => {
        const cache = new MockCache();
        const request = makeRequest();
        const response = makeResponse();
        cache.preload(request, response);
        const result = await strategy.execute(request, new Error('fail'), makeContext({ cache }));
        expect(result.success).toBe(true);
        expect(result.response).toEqual(response);
        expect(result.message).toContain('cached');
    });
    it('should fail when no cache is provided', async () => {
        const result = await strategy.execute(makeRequest(), new Error('fail'), makeContext());
        expect(result.success).toBe(false);
        expect(result.message).toContain('Cache not available');
    });
    it('should fail when cache misses', async () => {
        const cache = new MockCache();
        const result = await strategy.execute(makeRequest(), new Error('fail'), makeContext({ cache }));
        expect(result.success).toBe(false);
        expect(result.message).toContain('No cached response');
    });
});
// ---- SimplifiedOutputStrategy ----
describe('SimplifiedOutputStrategy', () => {
    let strategy;
    beforeEach(() => {
        strategy = new strategies_1.SimplifiedOutputStrategy();
    });
    it('should have name "simplified-output"', () => {
        expect(strategy.name).toBe('simplified-output');
    });
    it('should succeed for token-related errors', async () => {
        const result = await strategy.execute(makeRequest({ maxTokens: 2048 }), new Error('max_tokens exceeded'), makeContext());
        expect(result.success).toBe(true);
        expect(result.strategy).toBe('simplified-output');
        expect(result.message).toContain('Reduced');
        expect(result.message).toContain('1024');
    });
    it('should halve maxTokens when it is set', async () => {
        const result = await strategy.execute(makeRequest({ maxTokens: 1000 }), new Error('token limit reached'), makeContext());
        expect(result.success).toBe(true);
        expect(result.message).toContain('500');
    });
    it('should fail for non-token errors', async () => {
        const result = await strategy.execute(makeRequest(), new Error('network timeout'), makeContext());
        expect(result.success).toBe(false);
        expect(result.message).toContain('not token-related');
    });
    it('should fail when model not found for token error', async () => {
        const result = await strategy.execute(makeRequest({ model: 'unknown-model' }), new Error('token error occurred'), makeContext());
        expect(result.success).toBe(false);
        expect(result.message).toContain('not found');
    });
});
// ---- AsyncQueueFallbackStrategy ----
describe('AsyncQueueFallbackStrategy', () => {
    let strategy;
    beforeEach(() => {
        strategy = new strategies_1.AsyncQueueFallbackStrategy();
    });
    it('should have name "async-queue"', () => {
        expect(strategy.name).toBe('async-queue');
    });
    it('should queue the request and return a placeholder response', async () => {
        const request = makeRequest();
        const result = await strategy.execute(request, new Error('fail'), makeContext());
        expect(result.success).toBe(true);
        expect(result.response).toBeDefined();
        expect(result.response.id).toMatch(/^async-/);
        expect(result.message).toContain('queued');
        expect(strategy.getQueueSize()).toBe(1);
    });
    it('should track queued requests', async () => {
        await strategy.execute(makeRequest({ model: 'a' }), new Error('fail'), makeContext());
        await strategy.execute(makeRequest({ model: 'b' }), new Error('fail'), makeContext());
        expect(strategy.getQueueSize()).toBe(2);
        const queued = strategy.getQueuedRequests();
        expect(queued[0].request.model).toBe('a');
        expect(queued[1].request.model).toBe('b');
    });
    it('should clear the queue', async () => {
        await strategy.execute(makeRequest(), new Error('fail'), makeContext());
        expect(strategy.getQueueSize()).toBe(1);
        strategy.clearQueue();
        expect(strategy.getQueueSize()).toBe(0);
    });
});
// ---- FallbackChain ----
describe('FallbackChain', () => {
    it('should return the first successful strategy result', async () => {
        const chain = new strategies_1.FallbackChain();
        chain.addStrategy({
            name: 'always-fail',
            execute: async () => ({ success: false, strategy: 'always-fail', message: 'nope' }),
        });
        chain.addStrategy({
            name: 'always-succeed',
            execute: async () => ({ success: true, strategy: 'always-succeed', message: 'ok' }),
        });
        const result = await chain.execute(makeRequest(), new Error('fail'), makeContext());
        expect(result.success).toBe(true);
        expect(result.strategy).toBe('always-succeed');
    });
    it('should fail when all strategies fail', async () => {
        const chain = new strategies_1.FallbackChain();
        chain.addStrategy({
            name: 'fail-a',
            execute: async () => ({ success: false, strategy: 'fail-a', message: 'nope-a' }),
        });
        chain.addStrategy({
            name: 'fail-b',
            execute: async () => ({ success: false, strategy: 'fail-b', message: 'nope-b' }),
        });
        const result = await chain.execute(makeRequest(), new Error('fail'), makeContext());
        expect(result.success).toBe(false);
        expect(result.strategy).toBe('fallback-chain');
        expect(result.message).toContain('fail-a');
        expect(result.message).toContain('fail-b');
    });
    it('should handle strategy that throws an exception', async () => {
        const chain = new strategies_1.FallbackChain();
        chain.addStrategy({
            name: 'thrower',
            execute: async () => { throw new Error('boom'); },
        });
        chain.addStrategy({
            name: 'succeed',
            execute: async () => ({ success: true, strategy: 'succeed', message: 'ok' }),
        });
        const result = await chain.execute(makeRequest(), new Error('fail'), makeContext());
        expect(result.success).toBe(true);
        expect(result.strategy).toBe('succeed');
    });
    it('should work with real strategies in sequence', async () => {
        const chain = new strategies_1.FallbackChain();
        // ModelDowngradeStrategy will succeed if there's a cheaper model
        chain.addStrategy(new strategies_1.ModelDowngradeStrategy());
        chain.addStrategy(new strategies_1.ProviderSwitchStrategy());
        const result = await chain.execute(makeRequest(), new Error('fail'), makeContext());
        expect(result.success).toBe(true);
        // Should have downgraded to gpt-3.5-turbo
        expect(result.model).toBe('gpt-3.5-turbo');
    });
    it('should return failure when no strategies are added', async () => {
        const chain = new strategies_1.FallbackChain();
        const result = await chain.execute(makeRequest(), new Error('fail'), makeContext());
        expect(result.success).toBe(false);
        expect(result.strategy).toBe('fallback-chain');
    });
});
//# sourceMappingURL=strategies.test.js.map