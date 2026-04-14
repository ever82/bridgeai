/**
 * Matching Services
 * Provides optimized matching functionality
 */

// Export optimized service
export {
  OptimizedMatchingService,
  optimizedMatchingService,
} from './optimizedMatchingService';

// Re-export legacy service for backwards compatibility
export {
  MatchingService,
  matchingService,
} from '../matchingService';

// Export types
export type {
  MatchQueryOptions,
  MatchResult,
} from '../matchingService';
