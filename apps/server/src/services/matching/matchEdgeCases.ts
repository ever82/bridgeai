/**
 * Match Edge Case Handler
 *
 * Handles boundary conditions for the matching system:
 * 1. Unidirectional match detection - don't recommend when only one side matches
 * 2. Criteria change invalidation - refresh recommendations when preferences change
 * 3. Empty configuration graceful degradation
 */

import { ResumeProfile, JobCriteria, matchResumeToJob } from './resumeMatcher';

// ---------------------------------------------------------------------------
// 1. Unidirectional match filter
// ---------------------------------------------------------------------------

export interface BidirectionalMatchResult {
  jobId: string;
  candidateId: string;
  jobToCandidateScore: number; // job -> candidate direction
  candidateToJobScore: number; // candidate -> job direction
  mutualScore: number; // combined score
  isMutual: boolean; // both sides above threshold
}

const MUTUAL_MATCH_THRESHOLD = 40; // minimum score for mutual interest

/**
 * Evaluate a match bidirectionally - both job->candidate and candidate->job.
 * Only returns as mutual if both directions exceed threshold.
 */
export function evaluateBidirectionalMatch(
  resume: ResumeProfile & { id: string },
  job: JobCriteria & { id: string }
): BidirectionalMatchResult {
  // Direction 1: Job's perspective (does candidate fit the job?)
  const jobToCandidate = matchResumeToJob(resume, job);

  // Direction 2: Candidate's perspective (does job fit candidate's expectations?)
  // We construct a synthetic resume from the job's offering and a synthetic
  // job from the candidate's expectations, then re-run the matcher.
  const candidateToJob = matchResumeToJob(
    {
      skills: job.skills,
      experienceYears: job.minExperienceYears ?? 0,
      educationLevel: job.educationLevel,
      expectedSalary: {
        min: job.salary.min,
        max: job.salary.max,
        period: job.salary.period,
      },
      location: job.location,
    },
    {
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
    }
  );

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
export function filterMutualMatches(
  matches: BidirectionalMatchResult[]
): BidirectionalMatchResult[] {
  return matches.filter(m => m.isMutual);
}

// ---------------------------------------------------------------------------
// 2. Criteria change detection
// ---------------------------------------------------------------------------

interface CriteriaHash {
  skillsHash: string;
  salaryRange: string;
  locationHash: string;
}

function hashArray(arr: string[]): string {
  return [...arr].sort().join(',');
}

function computeCriteriaHash(criteria: {
  skills?: string[];
  salary?: { min?: number; max?: number };
  location?: { city?: string; isRemote?: boolean };
}): CriteriaHash {
  return {
    skillsHash: hashArray(criteria.skills || []),
    salaryRange: `${criteria.salary?.min || 0}-${criteria.salary?.max || 0}`,
    locationHash: `${criteria.location?.city || ''}-${criteria.location?.isRemote || false}`,
  };
}

export function haveCriteriaChanged(
  previousCriteria: CriteriaHash | null,
  currentCriteria: {
    skills?: string[];
    salary?: { min?: number; max?: number };
    location?: { city?: string; isRemote?: boolean };
  }
): { changed: boolean; current: CriteriaHash } {
  const current = computeCriteriaHash(currentCriteria);
  if (!previousCriteria) return { changed: true, current };
  return {
    changed:
      previousCriteria.skillsHash !== current.skillsHash ||
      previousCriteria.salaryRange !== current.salaryRange ||
      previousCriteria.locationHash !== current.locationHash,
    current,
  };
}

// ---------------------------------------------------------------------------
// 3. Empty configuration graceful degradation
// ---------------------------------------------------------------------------

export interface MatchConfig {
  minScore?: number;
  maxResults?: number;
  requireMutualMatch?: boolean;
}

const DEFAULT_CONFIG: Required<MatchConfig> = {
  minScore: 30,
  maxResults: 20,
  requireMutualMatch: false,
};

/**
 * Resolve match configuration with graceful defaults for missing fields
 */
export function resolveMatchConfig(config?: MatchConfig): Required<MatchConfig> {
  if (!config) return { ...DEFAULT_CONFIG };
  return {
    minScore: config.minScore ?? DEFAULT_CONFIG.minScore,
    maxResults: config.maxResults ?? DEFAULT_CONFIG.maxResults,
    requireMutualMatch: config.requireMutualMatch ?? DEFAULT_CONFIG.requireMutualMatch,
  };
}
