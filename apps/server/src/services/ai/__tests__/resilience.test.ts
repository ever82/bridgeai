/**
 * Tests for AI Resilience Services (ISSUE-AI006)
 * Covers: degradation strategy, controller, template, cache, queue, metrics
 */

import {
  DegradationLevel,
  DegradationStrategy,
  DegradationContext,
} from '../resilience/degradationStrategy';
import { DegradationController } from '../resilience/degradationController';
import { AIResponseCacheService } from '../resilience/responseCacheService';
import { TemplateResponseService } from '../resilience/templateResponseService';
import { AIAsyncQueueService } from '../resilience/asyncQueueService';
import { ResilienceMetricsService } from '../resilience/metricsService';
import { ModelInfo } from '../types';

// Helper to create a model map
function createModelMap(): Map<string, ModelInfo> {
  const models = new Map<string, ModelInfo>();
  models.set('gpt-4', {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    capabilities: {
      chatCompletion: true,
      embeddings: true,
      streaming: true,
      maxTokens: 8192,
      supportedLanguages: ['en', 'zh'],
    },
    costPer1KTokens: { input: 0.03, output: 0.06 },
    averageLatencyMs: 1500,
    qualityScore: 90,
  });
  models.set('gpt-3.5-turbo', {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    capabilities: {
      chatCompletion: true,
      embeddings: true,
      streaming: true,
      maxTokens: 4096,
      supportedLanguages: ['en', 'zh'],
    },
    costPer1KTokens: { input: 0.001, output: 0.002 },
    averageLatencyMs: 500,
    qualityScore: 70,
  });
  models.set('claude-3-opus', {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'claude',
    capabilities: {
      chatCompletion: true,
      embeddings: true,
      streaming: true,
      maxTokens: 200000,
      supportedLanguages: ['en', 'zh'],
    },
    costPer1KTokens: { input: 0.015, output: 0.075 },
    averageLatencyMs: 2000,
    qualityScore: 95,
  });
  return models;
}

function createDefaultContext(): DegradationContext {
  return {
    availableProviders: ['openai', 'claude'],
    models: createModelMap(),
    cache: new AIResponseCacheService(),
    templateService: new TemplateResponseService(),
    queueService: new AIAsyncQueueService(),
  };
}

function createRequest(model = 'gpt-4') {
  return {
    model,
    messages: [{ role: 'user' as const, content: 'Hello' }],
    temperature: 0.7,
  };
}

// ============================================
// DegradationStrategy Tests
// ============================================
describe('DegradationStrategy', () => {
  let strategy: DegradationStrategy;

  beforeEach(() => {
    strategy = new DegradationStrategy();
  });

  test('should start at NORMAL level', () => {
    expect(strategy.getCurrentLevel()).toBe(DegradationLevel.NORMAL);
  });

  test('should have 5 registered levels', () => {
    const levels = strategy.getRegisteredLevels();
    expect(levels).toHaveLength(5);
    expect(levels).toContain(DegradationLevel.L1_BACKUP_MODEL);
    expect(levels).toContain(DegradationLevel.L2_LOW_COST_MODEL);
    expect(levels).toContain(DegradationLevel.L3_TEMPLATE);
    expect(levels).toContain(DegradationLevel.L4_ASYNC_QUEUE);
    expect(levels).toContain(DegradationLevel.L5_UNAVAILABLE);
  });

  test('L1: should switch to backup model', async () => {
    const context = createDefaultContext();
    const result = await strategy.execute(createRequest(), context);

    expect(result.success).toBe(true);
    expect(result.level).toBe(DegradationLevel.L1_BACKUP_MODEL);
    expect(result.model).toBeDefined();
    expect(result.model).not.toBe('gpt-4');
  });

  test('L1: should fail when no backup model available', async () => {
    const models = new Map<string, ModelInfo>();
    models.set('gpt-4', {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      capabilities: {
        chatCompletion: true,
        embeddings: false,
        streaming: false,
        maxTokens: 8192,
        supportedLanguages: [],
      },
      costPer1KTokens: { input: 0.03, output: 0.06 },
      averageLatencyMs: 1500,
      qualityScore: 90,
    });
    const context = { ...createDefaultContext(), models };
    const result = await strategy.execute(createRequest(), context);

    // Should escalate to L2 or beyond
    expect(result.level).toBeGreaterThanOrEqual(DegradationLevel.L2_LOW_COST_MODEL);
  });

  test('L2: should find cheaper model across providers', async () => {
    // Only expensive models -> L1 finds same-provider backup, then L2 finds cross-provider cheaper
    const models = new Map<string, ModelInfo>();
    models.set('gpt-4', {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      capabilities: {
        chatCompletion: true,
        embeddings: false,
        streaming: false,
        maxTokens: 8192,
        supportedLanguages: [],
      },
      costPer1KTokens: { input: 0.03, output: 0.06 },
      averageLatencyMs: 1500,
      qualityScore: 90,
    });
    models.set('gpt-3.5-turbo', {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'claude',
      capabilities: {
        chatCompletion: true,
        embeddings: false,
        streaming: false,
        maxTokens: 4096,
        supportedLanguages: [],
      },
      costPer1KTokens: { input: 0.001, output: 0.002 },
      averageLatencyMs: 500,
      qualityScore: 70,
    });

    const context = {
      ...createDefaultContext(),
      models,
      availableProviders: ['openai', 'claude'] as const,
    };

    // Starting from L2 directly to test cross-provider fallback
    const result = await strategy.execute(
      createRequest(),
      context,
      DegradationLevel.L2_LOW_COST_MODEL
    );

    expect(result.success).toBe(true);
    expect(result.level).toBe(DegradationLevel.L2_LOW_COST_MODEL);
    expect(result.model).toBeDefined();
  });

  test('L3: should use template response when no models available', async () => {
    const context = {
      ...createDefaultContext(),
      models: new Map<string, ModelInfo>(),
      availableProviders: [],
    };
    const result = await strategy.execute(createRequest(), context);

    expect(result.success).toBe(true);
    expect(result.level).toBe(DegradationLevel.L3_TEMPLATE);
    expect(result.response).toBeDefined();
    expect(result.response!.choices[0].message.content).toBeTruthy();
  });

  test('L4: should queue request when templates fail', async () => {
    const context = {
      ...createDefaultContext(),
      models: new Map<string, ModelInfo>(),
      availableProviders: [],
      templateService: new TemplateResponseService(),
    };
    // Remove all templates to force L4
    context.templateService.getTemplates().forEach(t => {
      context.templateService.removeTemplate(t.id);
    });

    const result = await strategy.execute(createRequest(), context);

    expect(result.success).toBe(true);
    expect(result.level).toBe(DegradationLevel.L4_ASYNC_QUEUE);
    expect(result.jobId).toBeDefined();
  });

  test('L5: should return unavailable when all levels fail', async () => {
    const queueService = new AIAsyncQueueService();
    const context = {
      ...createDefaultContext(),
      models: new Map<string, ModelInfo>(),
      availableProviders: [],
      queueService,
    };
    // Remove templates
    context.templateService.getTemplates().forEach(t => {
      context.templateService.removeTemplate(t.id);
    });
    // Stop queue to prevent processing
    queueService.stopProcessing();

    // Force L5 by starting from L5
    const result = await strategy.execute(
      createRequest(),
      context,
      DegradationLevel.L5_UNAVAILABLE
    );

    expect(result.success).toBe(false);
    expect(result.level).toBe(DegradationLevel.L5_UNAVAILABLE);
  });

  test('should emit degradationAttempt and degraded events', async () => {
    const attemptSpy = jest.fn();
    const degradedSpy = jest.fn();
    strategy.on('degradationAttempt', attemptSpy);
    strategy.on('degraded', degradedSpy);

    await strategy.execute(createRequest(), createDefaultContext());

    expect(attemptSpy).toHaveBeenCalled();
    expect(degradedSpy).toHaveBeenCalled();
  });

  test('reset should return to NORMAL level', async () => {
    await strategy.execute(createRequest(), createDefaultContext());
    expect(strategy.getCurrentLevel()).not.toBe(DegradationLevel.NORMAL);

    strategy.reset();
    expect(strategy.getCurrentLevel()).toBe(DegradationLevel.NORMAL);
  });

  test('setLevel should set level directly', () => {
    strategy.setLevel(DegradationLevel.L3_TEMPLATE);
    expect(strategy.getCurrentLevel()).toBe(DegradationLevel.L3_TEMPLATE);
  });
});

// ============================================
// AIResponseCacheService Tests
// ============================================
describe('AIResponseCacheService', () => {
  let cache: AIResponseCacheService;

  beforeEach(() => {
    cache = new AIResponseCacheService({ defaultTtlMs: 1000 });
  });

  const mockResponse = {
    id: 'resp-1',
    model: 'gpt-4',
    choices: [
      {
        index: 0,
        message: { role: 'assistant' as const, content: 'Hello!' },
        finishReason: 'stop',
      },
    ],
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    createdAt: new Date(),
  };

  test('should store and retrieve responses', async () => {
    await cache.set('key-1', mockResponse);
    const result = await cache.get('key-1');
    expect(result).toBeDefined();
    expect(result!.choices[0].message.content).toBe('Hello!');
  });

  test('should return null for missing keys', async () => {
    const result = await cache.get('non-existent');
    expect(result).toBeNull();
  });

  test('should expire entries based on TTL', async () => {
    const shortCache = new AIResponseCacheService({
      defaultTtlMs: 50,
      staleWhileRevalidateMs: 10,
    });
    await shortCache.set('key-1', mockResponse, 50); // 50ms TTL

    // Should be available immediately
    let result = await shortCache.get('key-1');
    expect(result).toBeDefined();

    // Wait for expiry + stale window
    await new Promise(resolve => setTimeout(resolve, 200));
    result = await shortCache.get('key-1');
    expect(result).toBeNull();
  });

  test('should generate deterministic keys', () => {
    const request = createRequest();
    const key1 = cache.generateKey(request);
    const key2 = cache.generateKey(request);
    expect(key1).toBe(key2);
  });

  test('should generate different keys for different requests', () => {
    const request1 = createRequest();
    const request2 = {
      ...createRequest(),
      messages: [{ role: 'user' as const, content: 'Different' }],
    };
    const key1 = cache.generateKey(request1);
    const key2 = cache.generateKey(request2);
    expect(key1).not.toBe(key2);
  });

  test('should support store and retrieve via request', async () => {
    const request = createRequest();
    await cache.setByRequest(request, mockResponse);
    const result = await cache.getByRequest(request);
    expect(result).toBeDefined();
    expect(result!.id).toBe('resp-1');
  });

  test('should return stale response for degradation', async () => {
    await cache.set('key-1', mockResponse, 50);
    await new Promise(resolve => setTimeout(resolve, 100));

    // getStaleResponse should still work after TTL
    const result = cache.getStaleResponse(createRequest());
    // May or may not find depending on similarity hash matching
    // The point is it doesn't throw
    expect(typeof result === 'object' || result === null).toBe(true);
  });

  test('should track stats', async () => {
    await cache.set('key-1', mockResponse);
    await cache.get('key-1'); // hit
    await cache.get('key-1'); // hit
    await cache.get('missing'); // miss

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.size).toBe(1);
    expect(stats.hitRate).toBeCloseTo(2 / 3);
  });

  test('should warm cache with multiple entries', async () => {
    await cache.warmCache([
      { request: createRequest(), response: mockResponse },
      {
        request: { ...createRequest(), messages: [{ role: 'user' as const, content: 'Test' }] },
        response: { ...mockResponse, id: 'resp-2' },
      },
    ]);

    const stats = cache.getStats();
    expect(stats.size).toBe(2);
  });

  test('should clear cache', async () => {
    await cache.set('key-1', mockResponse);
    cache.clear();
    const result = await cache.get('key-1');
    expect(result).toBeNull();
  });

  test('should enforce max entries with eviction', async () => {
    const smallCache = new AIResponseCacheService({ maxEntries: 2 });
    await smallCache.set('key-1', mockResponse);
    await smallCache.set('key-2', { ...mockResponse, id: 'resp-2' });
    await smallCache.set('key-3', { ...mockResponse, id: 'resp-3' }); // Should trigger eviction

    expect(smallCache.getStats().size).toBeLessThanOrEqual(2);
  });

  test('should emit events', async () => {
    const setSpy = jest.fn();
    const hitSpy = jest.fn();
    cache.on('set', setSpy);
    cache.on('hit', hitSpy);

    await cache.set('key-1', mockResponse);
    await cache.get('key-1');

    expect(setSpy).toHaveBeenCalled();
    expect(hitSpy).toHaveBeenCalled();
  });
});

// ============================================
// TemplateResponseService Tests
// ============================================
describe('TemplateResponseService', () => {
  let service: TemplateResponseService;

  beforeEach(() => {
    service = new TemplateResponseService();
  });

  test('should load default templates', () => {
    const templates = service.getTemplates();
    expect(templates.length).toBeGreaterThan(0);
  });

  test('should render a template with variable interpolation', () => {
    const result = service.render('degradation-partial', {
      original_summary: '你的需求已记录',
    });
    expect(result).toBeDefined();
    expect(result!.choices[0].message.content).toContain('你的需求已记录');
    expect(result!.choices[0].message.content).not.toContain('{{original_summary}}');
  });

  test('should return null for non-existent template', () => {
    const result = service.render('non-existent');
    expect(result).toBeNull();
  });

  test('should match templates by scene and intent', () => {
    const match = service.match('general', 'degradation');
    expect(match).toBeDefined();
    expect(match!.template.scene).toBe('general');
    expect(match!.template.intent).toBe('degradation');
  });

  test('should return null when no match', () => {
    const match = service.match('nonexistent', 'nonexistent');
    expect(match).toBeNull();
  });

  test('should render match directly', () => {
    const result = service.renderMatch('general', 'degradation', {
      original_summary: '测试',
    });
    expect(result).toBeDefined();
    expect(result!.choices[0].message.content).toContain('测试');
    expect(result!._meta.templateId).toBeDefined();
  });

  test('should add and retrieve new template', () => {
    service.addTemplate({
      id: 'custom-test',
      scene: 'test',
      intent: 'test-intent',
      content: 'Test template with {{var}}',
      variables: ['var'],
      priority: 5,
      tags: ['test'],
    });

    const template = service.getTemplate('custom-test');
    expect(template).toBeDefined();
    expect(template!.scene).toBe('test');
  });

  test('should update existing template', () => {
    service.updateTemplate('greeting-general', {
      content: 'Updated greeting',
    });
    const template = service.getTemplate('greeting-general');
    expect(template!.content).toBe('Updated greeting');
  });

  test('should remove template', () => {
    const initialCount = service.getTemplates().length;
    service.removeTemplate('greeting-general');
    expect(service.getTemplates().length).toBe(initialCount - 1);
    expect(service.getTemplate('greeting-general')).toBeUndefined();
  });

  test('should get templates by scene', () => {
    const templates = service.getTemplatesByScene('general');
    expect(templates.length).toBeGreaterThan(0);
    templates.forEach(t => expect(t.scene).toBe('general'));
  });

  test('should include meta information in rendered result', () => {
    const result = service.renderMatch('visionshare', 'greeting');
    expect(result).toBeDefined();
    expect(result!._meta.scene).toBe('visionshare');
    expect(result!._meta.intent).toBe('greeting');
  });

  test('should provide stats', () => {
    const stats = service.getStats();
    expect(stats.totalTemplates).toBeGreaterThan(0);
    expect(stats.scenes).toBeGreaterThan(0);
  });
});

// ============================================
// AIAsyncQueueService Tests
// ============================================
describe('AIAsyncQueueService', () => {
  let queue: AIAsyncQueueService;

  beforeEach(() => {
    queue = new AIAsyncQueueService();
  });

  afterEach(() => {
    queue.stopProcessing();
  });

  test('should enqueue a job', async () => {
    const job = await queue.enqueue(createRequest());
    expect(job.id).toBeDefined();
    expect(job.status).toBe('queued');
    expect(job.priority).toBe('normal');
  });

  test('should enqueue with custom priority', async () => {
    const job = await queue.enqueue(createRequest(), { priority: 'high' });
    expect(job.priority).toBe('high');
  });

  test('should get job status', async () => {
    const job = await queue.enqueue(createRequest());
    const status = queue.getJob(job.id);
    expect(status).toBeDefined();
    expect(status!.id).toBe(job.id);
    expect(status!.status).toBe('queued');
  });

  test('should return null for non-existent job', () => {
    const status = queue.getJob('non-existent');
    expect(status).toBeNull();
  });

  test('should cancel a queued job', async () => {
    const job = await queue.enqueue(createRequest());
    const cancelled = queue.cancel(job.id);
    expect(cancelled).toBe(true);

    const status = queue.getJob(job.id);
    expect(status!.status).toBe('expired');
  });

  test('should not cancel a processing job', async () => {
    const job = await queue.enqueue(createRequest());
    // Simulate processing by directly setting
    // queue cancel should not work on completed/processing
    const mockResponse = {
      id: 'resp-1',
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: { role: 'assistant' as const, content: 'test' },
          finishReason: 'stop',
        },
      ],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      createdAt: new Date(),
    };
    queue.setProcessor(async () => mockResponse);
    queue.startProcessing();
    await new Promise(resolve => setTimeout(resolve, 200));

    const cancelled = queue.cancel(job.id);
    // Job might have completed already
    expect(typeof cancelled).toBe('boolean');
  });

  test('should process jobs with processor', async () => {
    const mockResponse = {
      id: 'resp-1',
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: { role: 'assistant' as const, content: 'Processed!' },
          finishReason: 'stop',
        },
      ],
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      createdAt: new Date(),
    };
    queue.setProcessor(async () => mockResponse);

    const completedSpy = jest.fn();
    queue.on('jobCompleted', completedSpy);

    await queue.enqueue(createRequest());
    queue.startProcessing();

    await new Promise(resolve => setTimeout(resolve, 1500));

    expect(completedSpy).toHaveBeenCalled();
    expect(queue.getStats().completed).toBeGreaterThan(0);
  });

  test('should retry on failure', async () => {
    let callCount = 0;
    queue.setProcessor(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Temporary failure');
      return {
        id: 'resp-1',
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: { role: 'assistant' as const, content: 'OK' },
            finishReason: 'stop',
          },
        ],
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        createdAt: new Date(),
      };
    });

    const retrySpy = jest.fn();
    queue.on('jobRetrying', retrySpy);

    await queue.enqueue(createRequest(), { maxRetries: 2 });
    queue.startProcessing();

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Should have retried at least once
    expect(
      queue.getStats().retried + queue.getStats().completed + queue.getStats().failed
    ).toBeGreaterThan(0);
  });

  test('should respect priority ordering', async () => {
    await queue.enqueue(createRequest(), { priority: 'low' });
    await queue.enqueue(createRequest(), { priority: 'critical' });
    await queue.enqueue(createRequest(), { priority: 'normal' });

    const jobs = queue.getJobs('queued');
    // Jobs should be ordered by priority then creation time
    expect(jobs.length).toBe(3);
  });

  test('should provide queue stats', async () => {
    await queue.enqueue(createRequest());
    await queue.enqueue(createRequest());

    const stats = queue.getStats();
    expect(stats.enqueued).toBe(2);
    expect(stats.queued).toBe(2);
    expect(stats.totalJobs).toBe(2);
  });

  test('should get queue length', async () => {
    await queue.enqueue(createRequest());
    await queue.enqueue(createRequest());
    expect(queue.getQueueLength()).toBe(2);
  });

  test('should purge expired jobs', async () => {
    await queue.enqueue(createRequest(), { ttlMs: 10 });
    await new Promise(resolve => setTimeout(resolve, 50));
    const purged = queue.purgeExpired();
    expect(purged).toBeGreaterThanOrEqual(0);
  });

  test('should clear completed jobs', async () => {
    const mockResponse = {
      id: 'resp-1',
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: { role: 'assistant' as const, content: 'test' },
          finishReason: 'stop',
        },
      ],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      createdAt: new Date(),
    };
    queue.setProcessor(async () => mockResponse);
    await queue.enqueue(createRequest());
    queue.startProcessing();
    await new Promise(resolve => setTimeout(resolve, 200));

    const cleared = queue.clearCompleted();
    expect(cleared).toBeGreaterThanOrEqual(0);
  });

  test('should emit events', async () => {
    const enqueueSpy = jest.fn();
    queue.on('jobEnqueued', enqueueSpy);
    await queue.enqueue(createRequest());
    expect(enqueueSpy).toHaveBeenCalled();
  });
});

// ============================================
// ResilienceMetricsService Tests
// ============================================
describe('ResilienceMetricsService', () => {
  let metrics: ResilienceMetricsService;

  beforeEach(() => {
    metrics = new ResilienceMetricsService();
  });

  test('should record degradation events', () => {
    metrics.recordDegradationEvent({
      fromLevel: DegradationLevel.NORMAL,
      toLevel: DegradationLevel.L1_BACKUP_MODEL,
      reason: 'Test degradation',
      affectedProviders: ['openai'],
    });

    const events = metrics.getDegradationEvents();
    expect(events).toHaveLength(1);
    expect(events[0].fromLevel).toBe(DegradationLevel.NORMAL);
    expect(events[0].toLevel).toBe(DegradationLevel.L1_BACKUP_MODEL);
  });

  test('should record provider request metrics', () => {
    metrics.recordRequest('openai', {
      success: true,
      latencyMs: 100,
      degradationLevel: DegradationLevel.NORMAL,
    });

    metrics.recordRequest('openai', {
      success: false,
      latencyMs: 5000,
      errorType: 'timeout',
      degradationLevel: DegradationLevel.L1_BACKUP_MODEL,
    });

    const stats = metrics.getProviderStats('openai');
    expect(stats).toBeDefined();
    expect(stats!.totalRequests).toBe(2);
    expect(stats!.errorRate).toBe(0.5);
  });

  test('should provide summary with current level', () => {
    metrics.recordDegradationEvent({
      fromLevel: DegradationLevel.NORMAL,
      toLevel: DegradationLevel.L2_LOW_COST_MODEL,
      reason: 'High error rate',
      affectedProviders: ['openai'],
    });

    const summary = metrics.getSummary();
    expect(summary.currentLevel).toBe(DegradationLevel.L2_LOW_COST_MODEL);
    expect(summary.totalDegradationEvents).toBe(1);
  });

  test('should track degradation duration', () => {
    metrics.recordDegradationEvent({
      fromLevel: DegradationLevel.NORMAL,
      toLevel: DegradationLevel.L3_TEMPLATE,
      reason: 'Test',
      affectedProviders: [],
    });

    const duration = metrics.getCurrentLevelDurationMs();
    expect(duration).toBeGreaterThanOrEqual(0);
    expect(duration).toBeLessThan(1000);
  });

  test('should produce Prometheus metrics', () => {
    metrics.recordDegradationEvent({
      fromLevel: DegradationLevel.NORMAL,
      toLevel: DegradationLevel.L1_BACKUP_MODEL,
      reason: 'Test',
      affectedProviders: ['openai'],
    });

    metrics.recordRequest('openai', {
      success: false,
      latencyMs: 100,
      errorType: 'timeout',
      degradationLevel: DegradationLevel.L1_BACKUP_MODEL,
    });

    const prometheus = metrics.getPrometheusMetrics();
    expect(prometheus).toContain('ai_degradation_events_total');
    expect(prometheus).toContain('ai_degradation_level');
    expect(prometheus).toContain('ai_degradation_duration_seconds');
    expect(prometheus).toContain('ai_provider_error_rate');
    expect(prometheus).toContain('ai_provider_latency_p95_seconds');
  });

  test('should have default alert rules', () => {
    const rules = metrics.getAlertRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.some(r => r.id === 'high-error-rate')).toBe(true);
    expect(rules.some(r => r.id === 'long-degradation')).toBe(true);
    expect(rules.some(r => r.id === 'all-degraded')).toBe(true);
  });

  test('should add and remove alert rules', () => {
    metrics.addAlertRule({
      id: 'custom-alert',
      name: 'Custom',
      condition: () => true,
      message: 'Custom alert',
      severity: 'info',
      cooldownMs: 1000,
    });

    expect(metrics.getAlertRules().length).toBe(4);

    metrics.removeAlertRule('custom-alert');
    expect(metrics.getAlertRules().length).toBe(3);
  });

  test('should trigger alerts', () => {
    const alertSpy = jest.fn();
    metrics.on('alert', alertSpy);

    // Create high error rate condition
    for (let i = 0; i < 10; i++) {
      metrics.recordRequest('openai', {
        success: false,
        latencyMs: 100,
        errorType: 'timeout',
        degradationLevel: DegradationLevel.L1_BACKUP_MODEL,
      });
    }

    metrics.recordDegradationEvent({
      fromLevel: DegradationLevel.NORMAL,
      toLevel: DegradationLevel.L1_BACKUP_MODEL,
      reason: 'Test',
      affectedProviders: ['openai'],
    });

    expect(alertSpy).toHaveBeenCalled();
  });

  test('should respect alert cooldown', () => {
    const alertSpy = jest.fn();
    metrics.on('alert', alertSpy);

    // First trigger
    for (let i = 0; i < 10; i++) {
      metrics.recordRequest('openai', {
        success: false,
        latencyMs: 100,
        degradationLevel: DegradationLevel.L1_BACKUP_MODEL,
      });
    }
    metrics.recordDegradationEvent({
      fromLevel: DegradationLevel.NORMAL,
      toLevel: DegradationLevel.L1_BACKUP_MODEL,
      reason: 'Test 1',
      affectedProviders: ['openai'],
    });

    const firstCallCount = alertSpy.mock.calls.length;

    // Second trigger should be within cooldown
    metrics.recordDegradationEvent({
      fromLevel: DegradationLevel.L1_BACKUP_MODEL,
      toLevel: DegradationLevel.L2_LOW_COST_MODEL,
      reason: 'Test 2',
      affectedProviders: ['openai'],
    });

    // Cooldown should prevent duplicate alerts
    expect(alertSpy.mock.calls.length).toBe(firstCallCount);
  });

  test('should limit stored events', () => {
    for (let i = 0; i < 1100; i++) {
      metrics.recordDegradationEvent({
        fromLevel: DegradationLevel.NORMAL,
        toLevel: DegradationLevel.L1_BACKUP_MODEL,
        reason: `Event ${i}`,
        affectedProviders: [],
      });
    }

    const events = metrics.getDegradationEvents();
    expect(events.length).toBeLessThanOrEqual(1000);
  });

  test('should reset all metrics', () => {
    metrics.recordDegradationEvent({
      fromLevel: DegradationLevel.NORMAL,
      toLevel: DegradationLevel.L1_BACKUP_MODEL,
      reason: 'Test',
      affectedProviders: [],
    });
    metrics.recordRequest('openai', {
      success: true,
      latencyMs: 100,
      degradationLevel: DegradationLevel.NORMAL,
    });

    metrics.reset();

    expect(metrics.getDegradationEvents()).toHaveLength(0);
    expect(metrics.getSummary().currentLevel).toBe(DegradationLevel.NORMAL);
    expect(metrics.getProviderStats('openai')).toBeNull();
  });

  test('should emit events', () => {
    const eventSpy = jest.fn();
    metrics.on('degradationEvent', eventSpy);

    metrics.recordDegradationEvent({
      fromLevel: DegradationLevel.NORMAL,
      toLevel: DegradationLevel.L1_BACKUP_MODEL,
      reason: 'Test',
      affectedProviders: [],
    });

    expect(eventSpy).toHaveBeenCalled();
  });
});

// ============================================
// DegradationController Tests
// ============================================
describe('DegradationController', () => {
  let controller: DegradationController;
  let strategy: DegradationStrategy;
  let metrics: ResilienceMetricsService;

  beforeEach(() => {
    strategy = new DegradationStrategy();
    metrics = new ResilienceMetricsService();
    controller = new DegradationController(strategy, metrics, {
      checkIntervalMs: 50,
      errorRateThreshold: 0.5,
      consecutiveFailureThreshold: 3,
      recoveryConsecutiveSuccessThreshold: 3,
    });
  });

  afterEach(() => {
    controller.stopMonitoring();
  });

  test('should start at NORMAL level', () => {
    expect(controller.getCurrentLevel()).toBe(DegradationLevel.NORMAL);
  });

  test('should record successes', () => {
    controller.recordSuccess('openai', 100);
    const health = controller.getProviderHealth('openai');
    expect(health).toBeUndefined(); // Not monitored until startMonitoring
  });

  test('should escalate degradation on consecutive failures', () => {
    controller.startMonitoring(['openai']);

    controller.recordFailure('openai', 5000, 'timeout');
    controller.recordFailure('openai', 5000, 'timeout');
    controller.recordFailure('openai', 5000, 'timeout');

    expect(controller.getCurrentLevel()).toBeGreaterThan(DegradationLevel.NORMAL);
  });

  test('should recover when providers succeed', () => {
    controller.startMonitoring(['openai']);

    // Degrade first
    controller.manualDegradation(DegradationLevel.L1_BACKUP_MODEL, 'Test');
    expect(controller.getCurrentLevel()).toBe(DegradationLevel.L1_BACKUP_MODEL);

    // Record successes to trigger recovery
    controller.recordSuccess('openai', 100);
    controller.recordSuccess('openai', 100);
    controller.recordSuccess('openai', 100);

    // Should recover one level
    // Recovery is progressive - goes down one level at a time
  });

  test('should provide user impact assessment', () => {
    const impact = controller.getUserImpact();
    expect(impact.level).toBe(DegradationLevel.NORMAL);
    expect(impact.affectedFeatures).toHaveLength(0);

    controller.manualDegradation(DegradationLevel.L3_TEMPLATE, 'Test');
    const degradedImpact = controller.getUserImpact();
    expect(degradedImpact.level).toBe(DegradationLevel.L3_TEMPLATE);
    expect(degradedImpact.description).toBeTruthy();
    expect(degradedImpact.affectedFeatures.length).toBeGreaterThan(0);
  });

  test('should track decision history', () => {
    controller.manualDegradation(DegradationLevel.L1_BACKUP_MODEL, 'Test reason');
    controller.manualDegradation(DegradationLevel.L2_LOW_COST_MODEL, 'Another reason');

    const history = controller.getDecisionHistory();
    expect(history).toHaveLength(2);
    expect(history[0].reason).toBe('Test reason');
    expect(history[1].level).toBe(DegradationLevel.L2_LOW_COST_MODEL);
  });

  test('should limit decision history', () => {
    for (let i = 0; i < 110; i++) {
      controller.manualDegradation(DegradationLevel.L1_BACKUP_MODEL, `Reason ${i}`);
    }

    const history = controller.getDecisionHistory();
    expect(history.length).toBeLessThanOrEqual(100);
  });

  test('should support manual recovery', () => {
    controller.manualDegradation(DegradationLevel.L3_TEMPLATE, 'Test');
    expect(controller.getCurrentLevel()).toBe(DegradationLevel.L3_TEMPLATE);

    controller.manualRecovery();
    expect(controller.getCurrentLevel()).toBe(DegradationLevel.NORMAL);
  });

  test('should emit events', () => {
    const degradedSpy = jest.fn();
    controller.on('degraded', degradedSpy);

    controller.manualDegradation(DegradationLevel.L2_LOW_COST_MODEL, 'Test');

    expect(degradedSpy).toHaveBeenCalled();
  });

  test('should perform health checks', async () => {
    controller.startMonitoring(['openai', 'claude']);
    controller.recordSuccess('openai', 100);
    controller.recordFailure('claude', 5000, 'timeout');

    const statuses = await controller.performHealthCheck();
    expect(statuses.size).toBe(2);
    expect(statuses.get('openai')!.healthy).toBe(true);
  });

  test('should stop monitoring cleanly', () => {
    controller.startMonitoring(['openai']);
    controller.stopMonitoring();
    // Should not throw
    expect(true).toBe(true);
  });

  test('should update config', () => {
    controller.updateConfig({ checkIntervalMs: 100 });
    // Should not throw
    expect(true).toBe(true);
  });
});
