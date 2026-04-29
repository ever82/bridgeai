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
export { MatchQueryService, matchQueryService, MatchQueryValidationError, } from './matchQueryService';
// Resume matching algorithm
export { matchResumeToJob, calculateSkillScore, calculateExperienceScore, calculateSalaryScore, calculateEducationScore, calculateLocationScore, DEFAULT_WEIGHTS, } from './resumeMatcher';
// Re-export legacy service for backwards compatibility
export { MatchingService, matchingService } from '../matchingService';
// Match edge case handling
export { evaluateBidirectionalMatch, filterMutualMatches, haveCriteriaChanged, resolveMatchConfig, } from './matchEdgeCases';
//# sourceMappingURL=index.js.map