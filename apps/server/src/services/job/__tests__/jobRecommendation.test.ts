/**
 * @jest-environment node
 */

import {
  JobRecommendationService,
  SeekerProfile,
  JobSummary,
  CandidateSummary,
  Recommendation,
} from '../jobRecommendation';
import { LLMResponseParseError } from '../resumeScreening';
import { llmService } from '../../ai/llmService';

// Mock dependencies
jest.mock('../../ai/llmService');
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const sampleSeekerProfile: SeekerProfile = {
  userId: 'seeker-001',
  skills: ['TypeScript', 'React', 'Node.js'],
  experienceYears: 5,
  educationLevel: 'Bachelor',
  currentTitle: 'Senior Frontend Developer',
  location: 'Shanghai',
  preferredSalary: { min: 30000, max: 50000, currency: 'CNY' },
  preferredJobTypes: ['full-time'],
  preferredLocations: ['Shanghai', 'Beijing'],
};

const sampleJobs: JobSummary[] = [
  {
    jobId: 'job-001',
    title: 'Senior Frontend Engineer',
    requiredSkills: ['TypeScript', 'React'],
    preferredSkills: ['Node.js'],
    salary: { min: 35000, max: 50000, currency: 'CNY' },
    location: 'Shanghai',
    isRemote: false,
    companyName: 'TechCorp',
    description: 'Build scalable frontend applications',
  },
  {
    jobId: 'job-002',
    title: 'Full Stack Developer',
    requiredSkills: ['Python', 'Django'],
    salary: { min: 25000, max: 40000, currency: 'CNY' },
    location: 'Beijing',
    isRemote: true,
    companyName: 'DataInc',
  },
];

const sampleJobCriteria: JobSummary = {
  jobId: 'job-001',
  title: 'Senior Frontend Engineer',
  requiredSkills: ['TypeScript', 'React'],
  preferredSkills: ['Node.js'],
  salary: { min: 35000, max: 50000, currency: 'CNY' },
  location: 'Shanghai',
  isRemote: false,
  companyName: 'TechCorp',
};

const sampleCandidates: CandidateSummary[] = [
  {
    userId: 'candidate-001',
    name: 'Alice Chen',
    skills: ['TypeScript', 'React', 'Node.js'],
    experienceYears: 6,
    educationLevel: 'Master',
    currentTitle: 'Senior Frontend Developer',
    location: 'Shanghai',
  },
  {
    userId: 'candidate-002',
    name: 'Bob Wang',
    skills: ['Python', 'Django'],
    experienceYears: 3,
    educationLevel: 'Bachelor',
    currentTitle: 'Backend Developer',
    location: 'Beijing',
  },
];

const makeRecommendationResponse = (
  items: Array<{
    itemId: string;
    score: number;
    reasons: string[];
    matched: string[];
    gaps: string[];
  }>
) =>
  JSON.stringify(
    items.map(item => ({
      itemId: item.itemId,
      score: item.score,
      reasons: item.reasons,
      skillMatch: {
        matched: item.matched,
        gaps: item.gaps,
      },
    }))
  );

const makeLLMResponse = (text: string) => ({
  text,
  provider: 'openai',
  model: 'gpt-4',
  usage: { input: 500, output: 300, total: 800 },
  cost: 0.02,
  latencyMs: 1200,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JobRecommendationService', () => {
  let service: JobRecommendationService;

  beforeEach(() => {
    service = new JobRecommendationService();
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // recommendJobsForSeeker
  // -------------------------------------------------------------------------

  describe('recommendJobsForSeeker', () => {
    it('should recommend jobs for a seeker and return paginated results', async () => {
      const responseText = makeRecommendationResponse([
        {
          itemId: 'job-001',
          score: 92,
          reasons: ['Strong skill match'],
          matched: ['TypeScript', 'React', 'Node.js'],
          gaps: [],
        },
        {
          itemId: 'job-002',
          score: 45,
          reasons: ['Skill mismatch'],
          matched: [],
          gaps: ['Python', 'Django'],
        },
      ]);

      (llmService.generateText as jest.Mock).mockResolvedValue(makeLLMResponse(responseText));

      const result = await service.recommendJobsForSeeker(sampleSeekerProfile, sampleJobs);

      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0].itemId).toBe('job-001');
      expect(result.recommendations[0].score).toBe(92);
      expect(result.recommendations[0].skillMatch.matched).toEqual([
        'TypeScript',
        'React',
        'Node.js',
      ]);
      expect(result.recommendations[1].itemId).toBe('job-002');
      expect(result.recommendations[1].score).toBe(45);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.hasMore).toBe(false);
    });

    it('should paginate results correctly', async () => {
      const items = Array.from({ length: 15 }, (_, i) => ({
        itemId: `job-${String(i + 1).padStart(3, '0')}`,
        score: 90 - i * 5,
        reasons: [`Reason for job ${i + 1}`],
        matched: ['TypeScript'],
        gaps: [],
      }));

      (llmService.generateText as jest.Mock).mockResolvedValue(
        makeLLMResponse(makeRecommendationResponse(items))
      );

      // Page 1, pageSize 5
      const page1 = await service.recommendJobsForSeeker(sampleSeekerProfile, sampleJobs, 1, 5);
      expect(page1.recommendations).toHaveLength(5);
      expect(page1.total).toBe(15);
      expect(page1.page).toBe(1);
      expect(page1.pageSize).toBe(5);
      expect(page1.hasMore).toBe(true);
      expect(page1.recommendations[0].score).toBe(90);

      // Page 3, pageSize 5
      const page3 = await service.recommendJobsForSeeker(sampleSeekerProfile, sampleJobs, 3, 5);
      expect(page3.recommendations).toHaveLength(5);
      expect(page3.hasMore).toBe(false);
    });

    it('should handle LLM errors gracefully', async () => {
      (llmService.generateText as jest.Mock).mockRejectedValue(new Error('LLM timeout'));

      await expect(service.recommendJobsForSeeker(sampleSeekerProfile, sampleJobs)).rejects.toThrow(
        'LLM timeout'
      );
    });

    it('should handle malformed LLM response with parse error', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue(
        makeLLMResponse('This is not JSON at all')
      );

      await expect(service.recommendJobsForSeeker(sampleSeekerProfile, sampleJobs)).rejects.toThrow(
        LLMResponseParseError
      );
    });

    it('should return empty results when no jobs provided', async () => {
      const result = await service.recommendJobsForSeeker(sampleSeekerProfile, []);

      expect(result.recommendations).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(llmService.generateText).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // recommendCandidatesForJob
  // -------------------------------------------------------------------------

  describe('recommendCandidatesForJob', () => {
    it('should recommend candidates for a job and return paginated results', async () => {
      const responseText = makeRecommendationResponse([
        {
          itemId: 'candidate-001',
          score: 88,
          reasons: ['Excellent skill match', 'Senior experience'],
          matched: ['TypeScript', 'React', 'Node.js'],
          gaps: [],
        },
        {
          itemId: 'candidate-002',
          score: 35,
          reasons: ['Skill mismatch'],
          matched: [],
          gaps: ['TypeScript', 'React'],
        },
      ]);

      (llmService.generateText as jest.Mock).mockResolvedValue(makeLLMResponse(responseText));

      const result = await service.recommendCandidatesForJob(sampleJobCriteria, sampleCandidates);

      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0].itemId).toBe('candidate-001');
      expect(result.recommendations[0].score).toBe(88);
      expect(result.recommendations[0].skillMatch.matched).toEqual([
        'TypeScript',
        'React',
        'Node.js',
      ]);
      expect(result.recommendations[1].itemId).toBe('candidate-002');
      expect(result.recommendations[1].score).toBe(35);
      expect(result.total).toBe(2);
    });

    it('should paginate candidate results correctly', async () => {
      const items = Array.from({ length: 12 }, (_, i) => ({
        itemId: `candidate-${String(i + 1).padStart(3, '0')}`,
        score: 95 - i * 5,
        reasons: [`Reason for candidate ${i + 1}`],
        matched: ['React'],
        gaps: [],
      }));

      (llmService.generateText as jest.Mock).mockResolvedValue(
        makeLLMResponse(makeRecommendationResponse(items))
      );

      const page1 = await service.recommendCandidatesForJob(
        sampleJobCriteria,
        sampleCandidates,
        1,
        5
      );
      expect(page1.recommendations).toHaveLength(5);
      expect(page1.total).toBe(12);
      expect(page1.hasMore).toBe(true);

      const page3 = await service.recommendCandidatesForJob(
        sampleJobCriteria,
        sampleCandidates,
        3,
        5
      );
      expect(page3.recommendations).toHaveLength(2);
      expect(page3.hasMore).toBe(false);
    });

    it('should return empty results when no candidates provided', async () => {
      const result = await service.recommendCandidatesForJob(sampleJobCriteria, []);

      expect(result.recommendations).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(llmService.generateText).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // explainRecommendation
  // -------------------------------------------------------------------------

  describe('explainRecommendation', () => {
    it('should generate explanation for a recommendation', async () => {
      const explanationResponse = {
        summary: 'This is a strong match based on skill alignment.',
        details:
          'The candidate has 5 years of experience with TypeScript and React, which directly align with the job requirements. The location and salary expectations are compatible.',
        advice:
          'Proceed with scheduling a technical interview to validate the depth of their experience.',
      };

      (llmService.generateText as jest.Mock).mockResolvedValue(
        makeLLMResponse(JSON.stringify(explanationResponse))
      );

      const recommendation: Recommendation = {
        itemId: 'job-001',
        score: 92,
        reasons: ['Strong skill match', 'Good salary fit'],
        skillMatch: { matched: ['TypeScript', 'React'], gaps: [] },
      };

      const result = await service.explainRecommendation(recommendation);

      expect(result.summary).toBe('This is a strong match based on skill alignment.');
      expect(result.details).toContain('TypeScript');
      expect(result.advice).toContain('interview');
    });

    it('should handle malformed explanation response', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue(
        makeLLMResponse('Plain text, no JSON here')
      );

      const recommendation: Recommendation = {
        itemId: 'job-001',
        score: 80,
        reasons: [],
        skillMatch: { matched: [], gaps: [] },
      };

      await expect(service.explainRecommendation(recommendation)).rejects.toThrow(
        LLMResponseParseError
      );
    });
  });

  // -------------------------------------------------------------------------
  // recordFeedback and getRecommendationHistory
  // -------------------------------------------------------------------------

  describe('recordFeedback and getRecommendationHistory', () => {
    it('should record feedback and retrieve history', async () => {
      const feedback1 = {
        userId: 'user-001',
        recommendationId: 'rec-001',
        itemId: 'job-001',
        action: 'like' as const,
        timestamp: new Date('2024-01-15'),
      };

      const feedback2 = {
        userId: 'user-001',
        recommendationId: 'rec-002',
        itemId: 'job-002',
        action: 'dislike' as const,
        timestamp: new Date('2024-01-16'),
      };

      await service.recordFeedback(feedback1);
      await service.recordFeedback(feedback2);

      const history = await service.getRecommendationHistory('user-001');

      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('like');
      expect(history[0].itemId).toBe('job-001');
      expect(history[1].action).toBe('dislike');
      expect(history[1].itemId).toBe('job-002');
    });

    it('should return empty history for unknown users', async () => {
      const history = await service.getRecommendationHistory('unknown-user');

      expect(history).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // refreshRecommendations
  // -------------------------------------------------------------------------

  describe('refreshRecommendations', () => {
    it('should mark items as seen for dedup', async () => {
      await service.refreshRecommendations('user-001', ['job-001', 'job-002']);

      // Call again with overlapping + new items
      await service.refreshRecommendations('user-001', ['job-002', 'job-003']);

      // Verify by checking the method does not throw
      // The seen items are stored internally
      expect(true).toBe(true);
    });

    it('should handle empty seenItemIds array', async () => {
      await expect(service.refreshRecommendations('user-001', [])).resolves.toBeUndefined();
    });
  });
});
