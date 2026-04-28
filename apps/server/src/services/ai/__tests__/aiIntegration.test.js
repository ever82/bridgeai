"use strict";
/**
 * AI Service Integration Tests
 * Integration tests that verify circuit breaker, LLM router, and fallback chain
 * work together end-to-end with the adapter layer.
 *
 * Components interact with each other for real; only the bottom-level LLM API
 * calls are mocked.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const circuitBreaker_1 = require("../circuitBreaker");
const llmRouter_1 = require("../llmRouter");
const strategies_1 = require("../fallback/strategies");
// ---------------------------------------------------------------------------
// Helpers & test data
// ---------------------------------------------------------------------------
const PROVIDERS = ['openai', 'claude', 'wenxin'];
function makeModel(overrides) {
    return {
        name: overrides.id,
        capabilities: {
            chatCompletion: true,
            embeddings: false,
            streaming: false,
            maxTokens: 4096,
            supportedLanguages: ['en', 'zh'],
        },
        costPer1KTokens: { input: 0.01, output: 0.02 },
        averageLatencyMs: 500,
        qualityScore: 80,
        ...overrides,
    };
}
const MODELS = [
    makeModel({
        id: 'gpt-4',
        provider: 'openai',
        costPer1KTokens: { input: 0.03, output: 0.06 },
        qualityScore: 95,
    }),
    makeModel({
        id: 'gpt-3.5-turbo',
        provider: 'openai',
        costPer1KTokens: { input: 0.001, output: 0.002 },
        qualityScore: 70,
    }),
    makeModel({
        id: 'claude-3-opus',
        provider: 'claude',
        costPer1KTokens: { input: 0.015, output: 0.075 },
        qualityScore: 92,
    }),
    makeModel({
        id: 'claude-3-haiku',
        provider: 'claude',
        costPer1KTokens: { input: 0.00025, output: 0.00125 },
        qualityScore: 60,
    }),
    makeModel({
        id: 'wenxin-4',
        provider: 'wenxin',
        costPer1KTokens: { input: 0.008, output: 0.008 },
        qualityScore: 75,
    }),
];
function makeRequest(overrides = {}) {
    return {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        ...overrides,
    };
}
function makeResponse(overrides = {}) {
    return {
        id: `resp-${Date.now()}`,
        model: 'gpt-4',
        choices: [
            {
                index: 0,
                message: { role: 'assistant', content: 'Hi there!' },
                finishReason: 'stop',
            },
        ],
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        createdAt: new Date(),
        ...overrides,
    };
}
/**
 * Creates a stub adapter that resolves or rejects based on `shouldFail`.
 */
function createStubAdapter(provider, shouldFail = false, errorMsg = 'Provider error') {
    return {
        id: `stub-${provider}`,
        provider,
        initialize: async () => { },
        healthCheck: async () => !shouldFail,
        getModels: async () => MODELS.filter(m => m.provider === provider),
        getModelInfo: async (modelId) => MODELS.find(m => m.id === modelId) ?? null,
        chatCompletion: async (_req, _ctx) => {
            if (shouldFail)
                throw new Error(errorMsg);
            return makeResponse({ model: _req.model });
        },
        streamChatCompletion: async () => {
            if (shouldFail)
                throw new Error(errorMsg);
        },
        embeddings: async () => {
            if (shouldFail)
                throw new Error(errorMsg);
            return {
                model: 'text-embedding-ada-002',
                data: [{ index: 0, embedding: [0.1, 0.2] }],
                usage: { promptTokens: 5, totalTokens: 5 },
            };
        },
        calculateCost: () => 0.001,
    };
}
/** A simple in-memory response cache for integration tests. */
class InMemoryCache {
    store = new Map();
    async get(key) {
        return this.store.get(key) ?? null;
    }
    async set(key, value) {
        this.store.set(key, value);
    }
    generateKey(request) {
        return `${request.model}:${JSON.stringify(request.messages)}`;
    }
}
/** Register breakers for all providers so getAvailableProviders() includes them. */
function registerAllBreakers(manager, config = {
    failureThreshold: 2,
    recoveryTimeoutMs: 60000,
    halfOpenMaxCalls: 1,
    successThreshold: 1,
}) {
    PROVIDERS.forEach(p => manager.getCircuitBreaker(p, config));
}
/** Setup router with all models and healthy providers. */
function setupRouter() {
    const router = new llmRouter_1.LLMRouter({ strategy: 'round-robin' });
    MODELS.forEach(m => router.registerModel(m));
    router.resetRoundRobin();
    PROVIDERS.forEach(p => {
        router.updateProviderHealth({
            provider: p,
            healthy: true,
            latencyMs: 100,
            averageLatencyMs: 150,
            successRate: 1,
            lastChecked: new Date(),
        });
    });
    return router;
}
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AI Service Integration', () => {
    // -----------------------------------------------------------------------
    // 1. LLM failures trigger circuit breaker OPEN
    // -----------------------------------------------------------------------
    describe('Circuit breaker + adapter integration', () => {
        let breakerManager;
        beforeEach(() => {
            breakerManager = new circuitBreaker_1.CircuitBreakerManager();
        });
        it('should open breaker after consecutive adapter failures', async () => {
            const failingAdapter = createStubAdapter('openai', true, 'Service unavailable');
            const breaker = breakerManager.getCircuitBreaker('openai', {
                failureThreshold: 3,
                recoveryTimeoutMs: 60000,
                halfOpenMaxCalls: 2,
                successThreshold: 2,
            });
            const request = makeRequest();
            const ctx = {
                requestId: 'r1',
                provider: 'openai',
                model: 'gpt-4',
                startTime: new Date(),
                routingStrategy: 'round-robin',
            };
            // Simulate 3 consecutive failures through circuit breaker
            for (let i = 0; i < 3; i++) {
                try {
                    await breaker.execute(() => failingAdapter.chatCompletion(request, ctx));
                }
                catch {
                    // expected
                }
            }
            expect(breaker.getState()).toBe('OPEN');
        });
        it('should reject requests when breaker is OPEN', async () => {
            const failingAdapter = createStubAdapter('openai', true, 'Timeout');
            const breaker = breakerManager.getCircuitBreaker('openai', {
                failureThreshold: 2,
                recoveryTimeoutMs: 60000,
                halfOpenMaxCalls: 1,
                successThreshold: 1,
            });
            const request = makeRequest();
            const ctx = {
                requestId: 'r1',
                provider: 'openai',
                model: 'gpt-4',
                startTime: new Date(),
                routingStrategy: 'round-robin',
            };
            // Trip the breaker
            for (let i = 0; i < 2; i++) {
                try {
                    await breaker.execute(() => failingAdapter.chatCompletion(request, ctx));
                }
                catch {
                    // expected
                }
            }
            expect(breaker.getState()).toBe('OPEN');
            // Subsequent request should be rejected immediately (not call adapter)
            const healthyAdapter = createStubAdapter('openai', false);
            await expect(breaker.execute(() => healthyAdapter.chatCompletion(request, ctx))).rejects.toThrow('Circuit breaker is OPEN for provider openai');
        });
        it('should recover from HALF_OPEN to CLOSED after successful requests', async () => {
            // Use a short recovery timeout so we can wait for HALF_OPEN transition
            const breaker = breakerManager.getCircuitBreaker('openai', {
                failureThreshold: 2,
                recoveryTimeoutMs: 1, // 1ms - transitions to HALF_OPEN almost immediately
                halfOpenMaxCalls: 3,
                successThreshold: 2,
            });
            // Trip breaker to OPEN via recordFailure (doesn't trigger checkTransition)
            breaker.recordFailure();
            breaker.recordFailure();
            expect(breaker.getState()).toBe('OPEN');
            // Wait for recovery timeout to pass
            await new Promise(r => setTimeout(r, 10));
            // Now checkTransition should move to HALF_OPEN
            expect(breaker.canExecute()).toBe(true);
            expect(breaker.getState()).toBe('HALF_OPEN');
            // Successful requests via a healthy adapter should close the breaker
            const healthyAdapter = createStubAdapter('openai', false);
            const request = makeRequest();
            const ctx = {
                requestId: 'r1',
                provider: 'openai',
                model: 'gpt-4',
                startTime: new Date(),
                routingStrategy: 'round-robin',
            };
            await breaker.execute(() => healthyAdapter.chatCompletion(request, ctx));
            expect(breaker.getState()).toBe('HALF_OPEN'); // 1 success, need 2
            await breaker.execute(() => healthyAdapter.chatCompletion(request, ctx));
            expect(breaker.getState()).toBe('CLOSED'); // 2 consecutive successes
            // Verify subsequent requests go through normally
            const result = await breaker.execute(() => healthyAdapter.chatCompletion(request, ctx));
            expect(result.choices[0].message.content).toBe('Hi there!');
        });
        it('should reopen breaker if HALF_OPEN probe fails', async () => {
            const breaker = breakerManager.getCircuitBreaker('openai', {
                failureThreshold: 2,
                recoveryTimeoutMs: 1, // 1ms - quick HALF_OPEN transition
                halfOpenMaxCalls: 2,
                successThreshold: 2,
            });
            breaker.recordFailure();
            breaker.recordFailure();
            expect(breaker.getState()).toBe('OPEN');
            // Wait for recovery timeout
            await new Promise(r => setTimeout(r, 10));
            // Transition to HALF_OPEN
            expect(breaker.canExecute()).toBe(true);
            expect(breaker.getState()).toBe('HALF_OPEN');
            // A failure in HALF_OPEN should immediately re-open
            const failingAdapter = createStubAdapter('openai', true, 'Still down');
            const request = makeRequest();
            const ctx = {
                requestId: 'r1',
                provider: 'openai',
                model: 'gpt-4',
                startTime: new Date(),
                routingStrategy: 'round-robin',
            };
            await expect(breaker.execute(() => failingAdapter.chatCompletion(request, ctx))).rejects.toThrow('Still down');
            // After failure in HALF_OPEN, breaker goes to OPEN
            // getState() triggers checkTransition but since not enough time has passed, stays OPEN
            expect(breaker.getState()).toBe('OPEN');
        });
    });
    // -----------------------------------------------------------------------
    // 2. Router + CircuitBreaker coordination
    // -----------------------------------------------------------------------
    describe('Router + CircuitBreaker coordination', () => {
        let router;
        let breakerManager;
        beforeEach(() => {
            router = setupRouter();
            breakerManager = new circuitBreaker_1.CircuitBreakerManager();
            registerAllBreakers(breakerManager);
        });
        it('should skip providers whose breakers are OPEN', () => {
            // Trip openai breaker
            const openaiBreaker = breakerManager.getCircuitBreaker('openai');
            openaiBreaker.recordFailure();
            openaiBreaker.recordFailure();
            expect(openaiBreaker.getState()).toBe('OPEN');
            // Get available providers from manager (all 3 registered, openai excluded)
            const available = breakerManager.getAvailableProviders();
            expect(available).not.toContain('openai');
            expect(available).toContain('claude');
            expect(available).toContain('wenxin');
            // Router should only route to healthy providers
            const request = makeRequest();
            const decision = router.route(request, available);
            expect(decision.provider).not.toBe('openai');
            expect(['claude', 'wenxin']).toContain(decision.provider);
        });
        it('should route to fallback provider when primary breaker is OPEN', () => {
            // Trip openai breaker
            const openaiBreaker = breakerManager.getCircuitBreaker('openai');
            openaiBreaker.recordFailure();
            openaiBreaker.recordFailure();
            // Trip claude breaker too
            const claudeBreaker = breakerManager.getCircuitBreaker('claude');
            claudeBreaker.recordFailure();
            claudeBreaker.recordFailure();
            const available = breakerManager.getAvailableProviders();
            expect(available).toEqual(['wenxin']);
            const request = makeRequest();
            const decision = router.route(request, available);
            expect(decision.provider).toBe('wenxin');
        });
        it('should include recovered provider back in routing after breaker closes', () => {
            const openaiBreaker = breakerManager.getCircuitBreaker('openai');
            // Trip breaker using recordFailure (no checkTransition call, stays OPEN)
            openaiBreaker.recordFailure();
            openaiBreaker.recordFailure();
            expect(openaiBreaker.getState()).toBe('OPEN');
            expect(breakerManager.getAvailableProviders()).not.toContain('openai');
            // Recover by force-closing
            openaiBreaker.forceClose();
            expect(openaiBreaker.getState()).toBe('CLOSED');
            // Now openai should be available again
            const available = breakerManager.getAvailableProviders();
            expect(available).toContain('openai');
        });
        it('should integrate full request flow: route -> check breaker -> call adapter', async () => {
            const adapters = new Map([
                ['openai', createStubAdapter('openai', true, 'Timeout')],
                ['claude', createStubAdapter('claude', false)],
                ['wenxin', createStubAdapter('wenxin', false)],
            ]);
            // Trip openai breaker
            const openaiBreaker = breakerManager.getCircuitBreaker('openai');
            openaiBreaker.recordFailure();
            openaiBreaker.recordFailure();
            // Get available providers (openai excluded)
            const available = breakerManager.getAvailableProviders();
            // Route request
            const request = makeRequest();
            const decision = router.route(request, available);
            expect(decision.provider).not.toBe('openai');
            // Execute via adapter using the breaker for the chosen provider
            const chosenBreaker = breakerManager.getCircuitBreaker(decision.provider);
            const ctx = {
                requestId: 'int-1',
                provider: decision.provider,
                model: decision.model,
                startTime: new Date(),
                routingStrategy: 'round-robin',
            };
            const adapter = adapters.get(decision.provider);
            const response = await chosenBreaker.execute(() => adapter.chatCompletion(request, ctx));
            expect(response).toBeDefined();
            expect(response.choices).toHaveLength(1);
            expect(chosenBreaker.getState()).toBe('CLOSED');
        });
    });
    // -----------------------------------------------------------------------
    // 3. Fallback chain integration
    // -----------------------------------------------------------------------
    describe('Fallback chain with circuit breaker and router', () => {
        let breakerManager;
        let models;
        beforeEach(() => {
            breakerManager = new circuitBreaker_1.CircuitBreakerManager();
            registerAllBreakers(breakerManager);
            models = new Map();
            MODELS.forEach(m => models.set(m.id, m));
        });
        it('should execute provider-switch strategy when primary provider fails', async () => {
            const chain = new strategies_1.FallbackChain();
            chain.addStrategy(new strategies_1.ModelDowngradeStrategy());
            chain.addStrategy(new strategies_1.ProviderSwitchStrategy());
            // Trip openai breaker so it's unavailable
            const openaiBreaker = breakerManager.getCircuitBreaker('openai');
            openaiBreaker.recordFailure();
            openaiBreaker.recordFailure();
            // Get available providers (excluding openai)
            const available = breakerManager.getAvailableProviders();
            expect(available).not.toContain('openai');
            // Execute fallback chain
            const request = makeRequest({ model: 'gpt-4' });
            const error = new Error('Provider openai is unavailable');
            const context = {
                availableProviders: available,
                models,
                attemptCount: 1,
                originalProvider: 'openai',
            };
            const result = await chain.execute(request, error, context);
            expect(result.success).toBe(true);
            expect(result.provider).toBeDefined();
            expect(result.model).toBeDefined();
        });
        it('should try cache fallback before model downgrade when cache is available', async () => {
            const cache = new InMemoryCache();
            const cachedResponse = makeResponse({ model: 'gpt-4' });
            // Pre-populate cache
            const request = makeRequest();
            await cache.set(cache.generateKey(request), cachedResponse);
            const chain = new strategies_1.FallbackChain();
            chain.addStrategy(new strategies_1.CacheFallbackStrategy());
            chain.addStrategy(new strategies_1.ModelDowngradeStrategy());
            chain.addStrategy(new strategies_1.ProviderSwitchStrategy());
            const context = {
                availableProviders: PROVIDERS,
                models,
                cache,
                attemptCount: 1,
                originalProvider: 'openai',
            };
            const result = await chain.execute(request, new Error('Rate limit'), context);
            expect(result.success).toBe(true);
            expect(result.strategy).toBe('cache-fallback');
            expect(result.response).toBeDefined();
            expect(result.response.id).toBe(cachedResponse.id);
        });
        it('should chain through multiple strategies until one succeeds', async () => {
            // No cache, models map has gpt-4 (openai) and claude/wenxin models (no cheaper openai model to downgrade to)
            const limitedModels = new Map();
            limitedModels.set('gpt-4', models.get('gpt-4'));
            limitedModels.set('claude-3-opus', models.get('claude-3-opus'));
            limitedModels.set('wenxin-4', models.get('wenxin-4'));
            const chain = new strategies_1.FallbackChain();
            chain.addStrategy(new strategies_1.CacheFallbackStrategy()); // no cache -> fail
            chain.addStrategy(new strategies_1.ModelDowngradeStrategy()); // no cheaper openai model -> fail
            chain.addStrategy(new strategies_1.ProviderSwitchStrategy()); // should find claude or wenxin
            const request = makeRequest({ model: 'gpt-4' });
            const context = {
                availableProviders: ['claude', 'wenxin'],
                models: limitedModels,
                attemptCount: 1,
                originalProvider: 'openai',
            };
            const result = await chain.execute(request, new Error('Error'), context);
            expect(result.success).toBe(true);
            expect(result.strategy).toBe('provider-switch');
            expect(['claude', 'wenxin']).toContain(result.provider);
        });
        it('should return failure when all fallback strategies are exhausted', async () => {
            const chain = new strategies_1.FallbackChain();
            chain.addStrategy(new strategies_1.CacheFallbackStrategy());
            chain.addStrategy(new strategies_1.ModelDowngradeStrategy());
            chain.addStrategy(new strategies_1.ProviderSwitchStrategy());
            // Empty models, no cache, single provider
            const request = makeRequest({ model: 'unknown-model' });
            const context = {
                availableProviders: ['openai'],
                models: new Map(),
                attemptCount: 3,
                originalProvider: 'openai',
            };
            const result = await chain.execute(request, new Error('All retries failed'), context);
            expect(result.success).toBe(false);
            expect(result.strategy).toBe('fallback-chain');
            expect(result.message).toContain('All fallback strategies failed');
        });
    });
    // -----------------------------------------------------------------------
    // 4. End-to-end: full flow with all components
    // -----------------------------------------------------------------------
    describe('End-to-end: failure -> circuit open -> fallback -> recovery', () => {
        it('should handle complete failure and recovery lifecycle', async () => {
            // Setup
            const router = setupRouter();
            const breakerManager = new circuitBreaker_1.CircuitBreakerManager();
            registerAllBreakers(breakerManager);
            const models = new Map();
            MODELS.forEach(m => models.set(m.id, m));
            const adapters = new Map();
            adapters.set('openai', createStubAdapter('openai', true, 'Service unavailable'));
            adapters.set('claude', createStubAdapter('claude', false));
            adapters.set('wenxin', createStubAdapter('wenxin', false));
            const request = makeRequest();
            // --- Phase 1: Failures trip the breaker ---
            const openaiBreaker = breakerManager.getCircuitBreaker('openai', {
                failureThreshold: 2,
                recoveryTimeoutMs: 60000,
                halfOpenMaxCalls: 3,
                successThreshold: 2,
            });
            const ctx1 = {
                requestId: 'e2e-1',
                provider: 'openai',
                model: 'gpt-4',
                startTime: new Date(),
                routingStrategy: 'round-robin',
            };
            const ctx2 = {
                requestId: 'e2e-2',
                provider: 'openai',
                model: 'gpt-4',
                startTime: new Date(),
                routingStrategy: 'round-robin',
            };
            await expect(openaiBreaker.execute(() => adapters.get('openai').chatCompletion(request, ctx1))).rejects.toThrow();
            await expect(openaiBreaker.execute(() => adapters.get('openai').chatCompletion(request, ctx2))).rejects.toThrow();
            expect(openaiBreaker.getState()).toBe('OPEN');
            // --- Phase 2: OPEN breaker rejects requests, fallback to other providers ---
            const available = breakerManager.getAvailableProviders();
            expect(available).not.toContain('openai');
            const decision = router.route(request, available);
            expect(['claude', 'wenxin']).toContain(decision.provider);
            const fallbackBreaker = breakerManager.getCircuitBreaker(decision.provider);
            const fallbackCtx = {
                requestId: 'e2e-fb',
                provider: decision.provider,
                model: decision.model,
                startTime: new Date(),
                routingStrategy: 'round-robin',
            };
            const response = await fallbackBreaker.execute(() => adapters.get(decision.provider).chatCompletion(request, fallbackCtx));
            expect(response.choices[0].message.content).toBe('Hi there!');
            // --- Phase 3: Recover openai ---
            adapters.set('openai', createStubAdapter('openai', false));
            openaiBreaker.forceClose();
            expect(openaiBreaker.getState()).toBe('CLOSED');
            // OpenAI should be available again
            const restoredAvailable = breakerManager.getAvailableProviders();
            expect(restoredAvailable).toContain('openai');
        });
        it('should handle multiple providers failing sequentially with fallback chain', async () => {
            const breakerManager = new circuitBreaker_1.CircuitBreakerManager();
            registerAllBreakers(breakerManager, {
                failureThreshold: 2,
                recoveryTimeoutMs: 60000,
                halfOpenMaxCalls: 1,
                successThreshold: 1,
            });
            const router = setupRouter();
            // All providers start failing except wenxin
            const adapters = new Map();
            adapters.set('openai', createStubAdapter('openai', true, 'OpenAI down'));
            adapters.set('claude', createStubAdapter('claude', true, 'Claude down'));
            adapters.set('wenxin', createStubAdapter('wenxin', false));
            // Trip openai and claude breakers
            for (const provider of ['openai', 'claude']) {
                const breaker = breakerManager.getCircuitBreaker(provider);
                breaker.recordFailure();
                breaker.recordFailure();
            }
            // Only wenxin should be available
            const available = breakerManager.getAvailableProviders();
            expect(available).toEqual(['wenxin']);
            // Route should select wenxin
            const request = makeRequest();
            const decision = router.route(request, available);
            expect(decision.provider).toBe('wenxin');
            // Execute successfully on wenxin
            const wenxinBreaker = breakerManager.getCircuitBreaker('wenxin');
            const ctx = {
                requestId: 'multi-1',
                provider: 'wenxin',
                model: decision.model,
                startTime: new Date(),
                routingStrategy: 'round-robin',
            };
            const response = await wenxinBreaker.execute(() => adapters.get('wenxin').chatCompletion(request, ctx));
            expect(response).toBeDefined();
            expect(response.choices).toHaveLength(1);
            // Verify breaker states
            expect(breakerManager.getCircuitBreaker('openai').getState()).toBe('OPEN');
            expect(breakerManager.getCircuitBreaker('claude').getState()).toBe('OPEN');
            expect(wenxinBreaker.getState()).toBe('CLOSED');
        });
    });
    // -----------------------------------------------------------------------
    // 5. CircuitBreakerManager integration
    // -----------------------------------------------------------------------
    describe('CircuitBreakerManager with multiple providers', () => {
        it('should track state across all providers independently', () => {
            const manager = new circuitBreaker_1.CircuitBreakerManager();
            const openaiBreaker = manager.getCircuitBreaker('openai', {
                failureThreshold: 2,
                recoveryTimeoutMs: 60000,
                halfOpenMaxCalls: 1,
                successThreshold: 1,
            });
            const claudeBreaker = manager.getCircuitBreaker('claude', {
                failureThreshold: 3,
                recoveryTimeoutMs: 60000,
                halfOpenMaxCalls: 1,
                successThreshold: 1,
            });
            const _wenxinBreaker = manager.getCircuitBreaker('wenxin', {
                failureThreshold: 3,
                recoveryTimeoutMs: 60000,
                halfOpenMaxCalls: 1,
                successThreshold: 1,
            });
            // Trip openai
            openaiBreaker.recordFailure();
            openaiBreaker.recordFailure();
            // Trip claude (needs 3 failures)
            claudeBreaker.recordFailure();
            claudeBreaker.recordFailure();
            const stats = manager.getAllStats();
            expect(stats).toHaveLength(3);
            const openaiStat = stats.find(s => s.provider === 'openai');
            expect(openaiStat.state).toBe('OPEN');
            const claudeStat = stats.find(s => s.provider === 'claude');
            expect(claudeStat.state).toBe('CLOSED'); // only 2 out of 3 failures
            const wenxinStat = stats.find(s => s.provider === 'wenxin');
            expect(wenxinStat.state).toBe('CLOSED');
        });
        it('should reset all breakers', () => {
            const manager = new circuitBreaker_1.CircuitBreakerManager();
            for (const provider of PROVIDERS) {
                const breaker = manager.getCircuitBreaker(provider, {
                    failureThreshold: 1,
                    recoveryTimeoutMs: 60000,
                    halfOpenMaxCalls: 1,
                    successThreshold: 1,
                });
                breaker.recordFailure();
            }
            // All should be OPEN
            expect(manager.getAllStats().every(s => s.state === 'OPEN')).toBe(true);
            manager.resetAll();
            // All should be CLOSED
            expect(manager.getAllStats().every(s => s.state === 'CLOSED')).toBe(true);
            expect(manager.getAvailableProviders()).toEqual(PROVIDERS);
        });
        it('should emit state change events across integrated components', () => {
            const manager = new circuitBreaker_1.CircuitBreakerManager();
            const stateChanges = [];
            const openaiBreaker = manager.getCircuitBreaker('openai', {
                failureThreshold: 2,
                recoveryTimeoutMs: 60000,
                halfOpenMaxCalls: 1,
                successThreshold: 1,
            });
            openaiBreaker.on('stateChange', event => {
                stateChanges.push({ provider: event.provider, state: event.state });
            });
            // Trip breaker
            openaiBreaker.recordFailure();
            openaiBreaker.recordFailure();
            expect(stateChanges).toHaveLength(1);
            expect(stateChanges[0]).toEqual({ provider: 'openai', state: 'OPEN' });
        });
    });
});
//# sourceMappingURL=aiIntegration.test.js.map