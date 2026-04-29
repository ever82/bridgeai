/**
 * Match Edge Case Handler
 *
 * Handles boundary conditions for the matching system:
 * 1. Unidirectional match detection - don't recommend when only one side matches
 * 2. Criteria change invalidation - refresh recommendations when preferences change
 * 3. Empty configuration graceful degradation
 */
import { matchResumeToJob } from './resumeMatcher';
const MUTUAL_MATCH_THRESHOLD = 40; // minimum score for mutual interest
/**
 * Evaluate a match bidirectionally - both job->candidate and candidate->job.
 * Only returns as mutual if both directions exceed threshold.
 */
export function evaluateBidirectionalMatch(resume, job) {
    // Direction 1: Job's perspective (does candidate fit the job?)
    const jobToCandidate = matchResumeToJob(resume, job);
    // Direction 2: Candidate's perspective (does job fit candidate's expectations?)
    // We construct a synthetic resume from the job's offering and a synthetic
    // job from the candidate's expectations, then re-run the matcher.
    const candidateToJob = matchResumeToJob({
        skills: job.skills,
        experienceYears: job.minExperienceYears ?? 0,
        educationLevel: job.educationLevel,
        expectedSalary: {
            min: job.salary.min,
            max: job.salary.max,
            period: job.salary.period,
        },
        location: job.location,
    }, {
        skills: resume.skills,
        salary: {
            min: resume.expectedSalary?.min ?? 0,
            max: resume.expectedSalary?.max ?? 0,
            period: resume.expectedSalary?.period ?? 'MONTHLY',
        },
        location: resume.location
            ? {
                city: resume.location.city,
                isRemote: resume.location.willingToRelocate,
            }
            : undefined,
    });
    const jobScore = jobToCandidate.totalScore;
    const candidateScore = candidateToJob.totalScore;
    const mutualScore = jobScore * 0.6 + candidateScore * 0.4; // weight job side slightly more
    return {
        jobId: job.id,
        candidateId: resume.id,
        jobToCandidateScore: jobScore,
        candidateToJobScore: candidateScore,
        mutualScore,
        isMutual: jobScore >= MUTUAL_MATCH_THRESHOLD && candidateScore >= MUTUAL_MATCH_THRESHOLD,
    };
}
/**
 * Filter matches to only include mutual (bidirectional) matches
 */
export function filterMutualMatches(matches) {
    return matches.filter(m => m.isMutual);
}
function hashArray(arr) {
    return [...arr].sort().join(',');
}
function computeCriteriaHash(criteria) {
    return {
        skillsHash: hashArray(criteria.skills || []),
        salaryRange: `${criteria.salary?.min || 0}-${criteria.salary?.max || 0}`,
        locationHash: `${criteria.location?.city || ''}-${criteria.location?.isRemote || false}`,
    };
}
export function haveCriteriaChanged(previousCriteria, currentCriteria) {
    const current = computeCriteriaHash(currentCriteria);
    if (!previousCriteria)
        return { changed: true, current };
    return {
        changed: previousCriteria.skillsHash !== current.skillsHash ||
            previousCriteria.salaryRange !== current.salaryRange ||
            previousCriteria.locationHash !== current.locationHash,
        current,
    };
}
const DEFAULT_CONFIG = {
    minScore: 30,
    maxResults: 20,
    requireMutualMatch: false,
};
/**
 * Resolve match configuration with graceful defaults for missing fields
 */
export function resolveMatchConfig(config) {
    if (!config)
        return { ...DEFAULT_CONFIG };
    return {
        minScore: config.minScore ?? DEFAULT_CONFIG.minScore,
        maxResults: config.maxResults ?? DEFAULT_CONFIG.maxResults,
        requireMutualMatch: config.requireMutualMatch ?? DEFAULT_CONFIG.requireMutualMatch,
    };
}
//# sourceMappingURL=matchEdgeCases.js.map