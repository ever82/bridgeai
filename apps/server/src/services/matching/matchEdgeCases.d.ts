/**
 * Match Edge Case Handler
 *
 * Handles boundary conditions for the matching system:
 * 1. Unidirectional match detection - don't recommend when only one side matches
 * 2. Criteria change invalidation - refresh recommendations when preferences change
 * 3. Empty configuration graceful degradation
 */
import { ResumeProfile, JobCriteria } from './resumeMatcher';
export interface BidirectionalMatchResult {
    jobId: string;
    candidateId: string;
    jobToCandidateScore: number;
    candidateToJobScore: number;
    mutualScore: number;
    isMutual: boolean;
}
/**
 * Evaluate a match bidirectionally - both job->candidate and candidate->job.
 * Only returns as mutual if both directions exceed threshold.
 */
export declare function evaluateBidirectionalMatch(resume: ResumeProfile & {
    id: string;
}, job: JobCriteria & {
    id: string;
}): BidirectionalMatchResult;
/**
 * Filter matches to only include mutual (bidirectional) matches
 */
export declare function filterMutualMatches(matches: BidirectionalMatchResult[]): BidirectionalMatchResult[];
interface CriteriaHash {
    skillsHash: string;
    salaryRange: string;
    locationHash: string;
}
export declare function haveCriteriaChanged(previousCriteria: CriteriaHash | null, currentCriteria: {
    skills?: string[];
    salary?: {
        min?: number;
        max?: number;
    };
    location?: {
        city?: string;
        isRemote?: boolean;
    };
}): {
    changed: boolean;
    current: CriteriaHash;
};
export interface MatchConfig {
    minScore?: number;
    maxResults?: number;
    requireMutualMatch?: boolean;
}
/**
 * Resolve match configuration with graceful defaults for missing fields
 */
export declare function resolveMatchConfig(config?: MatchConfig): Required<MatchConfig>;
export {};
//# sourceMappingURL=matchEdgeCases.d.ts.map