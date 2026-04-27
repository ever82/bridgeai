/**
 * Resilience Services Index
 * 导出所有降级与容错服务
 */

export { DegradationLevel, DegradationStrategy, degradationStrategy } from './degradationStrategy';

export type {
  DegradationLevelHandler,
  DegradationContext,
  DegradationResult,
} from './degradationStrategy';

export {
  DegradationController,
  degradationController,
  getDegradationController,
} from './degradationController';

export type {
  HealthStatus,
  DegradationDecision,
  DegradationControllerConfig,
} from './degradationController';

export { AIResponseCacheService, responseCacheService } from './responseCacheService';

export type { CacheEntry, CacheConfig } from './responseCacheService';

export { TemplateResponseService, templateResponseService } from './templateResponseService';

export type { Template, TemplateMatch, TemplateRenderResult } from './templateResponseService';

export { AIAsyncQueueService, asyncQueueService } from './asyncQueueService';

export type {
  AsyncJob,
  AsyncJobResult,
  JobPriority,
  JobStatus,
  QueueConfig,
} from './asyncQueueService';

export { ResilienceMetricsService, resilienceMetricsService } from './metricsService';

export type {
  DegradationEvent,
  DegradationRequestRecord,
  AlertRule,
  ResilienceMetricsSummary,
} from './metricsService';
