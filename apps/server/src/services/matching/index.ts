/**
 * Matching Services
 * Provides optimized matching functionality
 */

// Export optimized service
export { OptimizedMatchingService, optimizedMatchingService } from './optimizedMatchingService';

// Export QueryEngine
export { QueryEngine, queryEngine } from './queryEngine';

// Export QuerySubscriptionManager
export { QuerySubscriptionManager, querySubscriptionManager } from './querySubscriptionManager';

// Export MatchQueryService (HTTP/WS-facing API)
export {
  MatchQueryService,
  matchQueryService,
  MatchQueryValidationError,
} from './matchQueryService';

// Re-export legacy service for backwards compatibility
export { MatchingService, matchingService } from '../matchingService';

// Export types
export type { MatchQueryOptions, MatchResult } from '../matchingService';

export type { ExecutionPlan, QueryResult, ResourceLimits } from './queryEngine';

export type {
  Subscription,
  SubscriptionEvent,
  IncrementalUpdate,
} from './querySubscriptionManager';
