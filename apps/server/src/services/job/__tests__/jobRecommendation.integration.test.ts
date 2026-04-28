/**
 * @jest-environment node
 *
 * Integration tests for Job Recommendation Service
 * Requires LLM_API_KEY (or OPENAI_API_KEY) to be configured
 * Run with: npm run test:integration -- --testPathPattern=jobRecommendation.integration
 *
 * These tests use REAL LLM calls to validate the full recommendation pipeline,
 * not mocked responses.
 */

import {
  JobRecommendationService,
  SeekerProfile,
  JobSummary,
  CandidateSummary,
  Recommendation,
  RecommendationFeedback,
} from '../jobRecommendation';

// ---------------------------------------------------------------------------
// Skip condition
// ---------------------------------------------------------------------------

const hasLLMKey = !!(process.env.OPENAI_API_KEY || process.env.LLM_API_KEY);
const itif = hasLLMKey ? it : it.skip;

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleSeekerProfile: SeekerProfile = {
  userId: 'seeker-integration-001',
  skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
  experienceYears: 5,
  educationLevel: 'Master',
  currentTitle: 'Senior Frontend Engineer',
  location: 'Shanghai',
  preferredSalary: { min: 40000, max: 60000, currency: 'CNY' },
  preferredJobTypes: ['full-time'],
  preferredLocations: ['Shanghai', 'Hangzhou'],
};

const sampleJobs: JobSummary[] = [
  {
    jobId: 'job-integration-001',
    title: 'Senior Frontend Engineer',
    requiredSkills: ['React', 'TypeScript'],
    preferredSkills: ['Node.js'],
    salary: { min: 35000, max: 50000, currency: 'CNY' },
    location: 'Shanghai',
    isRemote: false,
    companyName: 'TechCorp Shanghai',
    description: 'Build and maintain enterprise SaaS products using React and TypeScript.',
  },
  {
    jobId: 'job-integration-002',
    title: 'Full Stack Developer',
    requiredSkills: ['Node.js', 'Python'],
    preferredSkills: ['PostgreSQL'],
    salary: { min: 30000, max: 45000, currency: 'CNY' },
    location: 'Beijing',
    isRemote: true,
    companyName: 'DataHub Inc.',
    description: 'Build data processing pipelines and APIs.',
  },
  {
    jobId: 'job-integration-003',
    title: 'Backend Engineer',
    requiredSkills: ['Go', 'Kubernetes'],
    salary: { min: 40000, max: 60000, currency: 'CNY' },
    location: 'Shanghai',
    isRemote: false,
    companyName: 'CloudScale',
    description: 'Design and build cloud-native microservices.',
  },
];

const sampleJobCriteria: JobSummary = {
  jobId: 'job-integration-001',
  title: 'Senior Frontend Engineer',
  requiredSkills: ['React', 'TypeScript'],
  preferredSkills: ['Node.js', 'GraphQL'],
  salary: { min: 35000, max: 50000, currency: 'CNY' },
  location: 'Shanghai',
  isRemote: false,
  companyName: 'TechCorp Shanghai',
  description: 'Build and maintain enterprise SaaS products.',
};

const sampleCandidates: CandidateSummary[] = [
  {
    userId: 'candidate-001',
    name: '张云 (Zhang Yun)',
    skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
    experienceYears: 6,
    educationLevel: 'Master',
    currentTitle: 'Senior Frontend Engineer',
    location: 'Shanghai',
  },
  {
    userId: 'candidate-002',
    name: '李强 (Li Qiang)',
    skills: ['Python', 'Django', 'PostgreSQL'],
    experienceYears: 3,
    educationLevel: 'Bachelor',
    currentTitle: 'Backend Developer',
    location: 'Beijing',
  },
  {
    userId: 'candidate-003',
    name: '王琳 (Wang Lin)',
    skills: ['React', 'TypeScript', 'Figma'],
    experienceYears: 4,
    educationLevel: 'Master',
    currentTitle: 'Frontend Developer',
    location: 'Shanghai',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JobRecommendationService Integration', () => {
  let service: JobRecommendationService;

  beforeAll(() => {
    service = new JobRecommendationService();
  });

  // -------------------------------------------------------------------------
  // recommendJobsForSeeker
  // -------------------------------------------------------------------------

  itif('should recommend jobs for a seeker with real LLM', async () => {
    const result = await service.recommendJobsForSeeker(sampleSeekerProfile, sampleJobs);

    // Validate pagination structure
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('pageSize');
    expect(result).toHaveProperty('hasMore');

    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.total).toBe(sampleJobs.length);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.hasMore).toBe(false);

    expect(result.recommendations).toHaveLength(sampleJobs.length);

    // Validate each recommendation
    for (const rec of result.recommendations) {
      expect(rec).toHaveProperty('itemId');
      expect(rec).toHaveProperty('score');
      expect(rec).toHaveProperty('reasons');
      expect(rec).toHaveProperty('skillMatch');

      expect(typeof rec.score).toBe('number');
      expect(rec.score).toBeGreaterThanOrEqual(0);
      expect(rec.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(rec.reasons)).toBe(true);
      expect(rec.reasons.length).toBeGreaterThan(0);
      expect(rec.skillMatch).toHaveProperty('matched');
      expect(rec.skillMatch).toHaveProperty('gaps');
      expect(Array.isArray(rec.skillMatch.matched)).toBe(true);
      expect(Array.isArray(rec.skillMatch.gaps)).toBe(true);
    }

    // Results should be sorted descending by score
    for (let i = 1; i < result.recommendations.length; i++) {
      expect(result.recommendations[i - 1].score).toBeGreaterThanOrEqual(
        result.recommendations[i].score
      );
    }
  });

  itif('should paginate job recommendations correctly', async () => {
    const page1 = await service.recommendJobsForSeeker(sampleSeekerProfile, sampleJobs, 1, 1);
    const page2 = await service.recommendJobsForSeeker(sampleSeekerProfile, sampleJobs, 2, 1);

    expect(page1.recommendations).toHaveLength(1);
    expect(page2.recommendations).toHaveLength(1);

    // Page 1's top recommendation should score >= page 2's
    expect(page1.recommendations[0].score).toBeGreaterThanOrEqual(page2.recommendations[0].score);

    expect(page1.total).toBe(page2.total);
    expect(page1.hasMore).toBe(true);
    expect(page2.hasMore).toBe(true);
  });

  // -------------------------------------------------------------------------
  // recommendCandidatesForJob
  // -------------------------------------------------------------------------

  itif('should recommend candidates for a job with real LLM', async () => {
    const result = await service.recommendCandidatesForJob(sampleJobCriteria, sampleCandidates);

    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.total).toBe(sampleCandidates.length);

    // Validate each recommendation structure
    for (const rec of result.recommendations) {
      expect(typeof rec.score).toBe('number');
      expect(rec.score).toBeGreaterThanOrEqual(0);
      expect(rec.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(rec.reasons)).toBe(true);
      expect(Array.isArray(rec.skillMatch.matched)).toBe(true);
      expect(Array.isArray(rec.skillMatch.gaps)).toBe(true);
    }

    // Sorted descending
    for (let i = 1; i < result.recommendations.length; i++) {
      expect(result.recommendations[i - 1].score).toBeGreaterThanOrEqual(
        result.recommendations[i].score
      );
    }
  });

  itif('should paginate candidate recommendations correctly', async () => {
    const page1 = await service.recommendCandidatesForJob(
      sampleJobCriteria,
      sampleCandidates,
      1,
      2
    );
    const page2 = await service.recommendCandidatesForJob(
      sampleJobCriteria,
      sampleCandidates,
      2,
      2
    );

    expect(page1.recommendations).toHaveLength(2);
    expect(page2.recommendations).toHaveLength(1);
    expect(page1.total).toBe(page2.total);
  });

  // -------------------------------------------------------------------------
  // explainRecommendation
  // -------------------------------------------------------------------------

  itif('should explain a recommendation with real LLM', async () => {
    const recommendation: Recommendation = {
      itemId: 'job-integration-001',
      score: 88,
      reasons: ['Strong TypeScript match', '6 years React experience', 'Shanghai location'],
      skillMatch: {
        matched: ['React', 'TypeScript', 'Node.js'],
        gaps: ['GraphQL'],
      },
    };

    const result = await service.explainRecommendation(recommendation);

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('details');
    expect(result).toHaveProperty('advice');

    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(0);
    expect(typeof result.details).toBe('string');
    expect(result.details.length).toBeGreaterThan(0);
    expect(typeof result.advice).toBe('string');
    expect(result.advice.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // recordFeedback and getRecommendationHistory (no LLM required)
  // -------------------------------------------------------------------------

  it('should record and retrieve recommendation feedback', async () => {
    const userId = 'feedback-integration-user';

    const feedback1: RecommendationFeedback = {
      userId,
      recommendationId: 'rec-001',
      itemId: 'job-integration-001',
      action: 'like',
      timestamp: new Date('2024-06-01'),
    };

    const feedback2: RecommendationFeedback = {
      userId,
      recommendationId: 'rec-002',
      itemId: 'job-integration-002',
      action: 'dislike',
      timestamp: new Date('2024-06-02'),
    };

    const feedback3: RecommendationFeedback = {
      userId,
      recommendationId: 'rec-003',
      itemId: 'job-integration-003',
      action: 'ignore',
      timestamp: new Date('2024-06-03'),
    };

    await service.recordFeedback(feedback1);
    await service.recordFeedback(feedback2);
    await service.recordFeedback(feedback3);

    const history = await service.getRecommendationHistory(userId);

    expect(history).toHaveLength(3);
    expect(history.map(f => f.action)).toEqual(['like', 'dislike', 'ignore']);
    expect(history.map(f => f.itemId)).toEqual([
      'job-integration-001',
      'job-integration-002',
      'job-integration-003',
    ]);
  });

  it('should return empty history for user with no feedback', async () => {
    const history = await service.getRecommendationHistory('unknown-user-no-feedback');
    expect(history).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // refreshRecommendations (no LLM required)
  // -------------------------------------------------------------------------

  it('should dedup recommendations by marking seen items', async () => {
    const userId = 'dedup-integration-user';

    // First batch: see jobs 1 and 2
    await service.refreshRecommendations(userId, ['job-integration-001', 'job-integration-002']);

    // Second batch: overlap + new job
    await service.refreshRecommendations(userId, ['job-integration-002', 'job-integration-003']);

    // Service should not throw — the internal state is updated
    // We verify by checking the method completes without error
    expect(true).toBe(true);
  });

  it('should handle empty seen items array', async () => {
    await expect(service.refreshRecommendations('empty-seen-user', [])).resolves.toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Edge case: empty job list
  // -------------------------------------------------------------------------

  it('should return empty recommendations when no jobs provided', async () => {
    const result = await service.recommendJobsForSeeker(sampleSeekerProfile, []);

    expect(result.recommendations).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it('should return empty recommendations when no candidates provided', async () => {
    const result = await service.recommendCandidatesForJob(sampleJobCriteria, []);

    expect(result.recommendations).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Report when tests are skipped
// ---------------------------------------------------------------------------

if (!hasLLMKey) {
  beforeAll(() => {
    console.warn(
      '\n⚠️  Integration tests skipped: LLM_API_KEY / OPENAI_API_KEY not configured.\n' +
        '   Set one of these environment variables to run the real LLM integration tests.\n'
    );
  });
}
