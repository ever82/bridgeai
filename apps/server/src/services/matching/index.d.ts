/**
 * Matching Services
 * Provides optimized matching functionality
 */
export { OptimizedMatchingService, optimizedMatchingService } from './optimizedMatchingService';
export { QueryEngine, queryEngine } from './queryEngine';
export { QuerySubscriptionManager, querySubscriptionManager } from './querySubscriptionManager';
export { MatchQueryService, matchQueryService, MatchQueryValidationError, } from './matchQueryService';
export { matchResumeToJob, calculateSkillScore, calculateExperienceScore, calculateSalaryScore, calculateEducationScore, calculateLocationScore, DEFAULT_WEIGHTS, } from './resumeMatcher';
export type { ResumeProfile, JobCriteria, ResumeMatchResult, DimensionScore, WeightConfig, } from './resumeMatcher';
export { MatchingService, matchingService } from '../matchingService';
export type { MatchQueryOptions, MatchResult } from '../matchingService';
export type { ExecutionPlan, QueryResult, ResourceLimits } from './queryEngine';
export type { Subscription, SubscriptionEvent, IncrementalUpdate, } from './querySubscriptionManager';
export { evaluateBidirectionalMatch, filterMutualMatches, haveCriteriaChanged, resolveMatchConfig, } from './matchEdgeCases';
export type { BidirectionalMatchResult, MatchConfig } from './matchEdgeCases';
//# sourceMappingURL=index.d.ts.map