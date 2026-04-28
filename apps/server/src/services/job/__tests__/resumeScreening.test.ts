/**
 * @jest-environment node
 */

import {
  ResumeScreeningService,
  ResumeScreeningRequest,
  BatchScreeningRequest,
  LLMResponseParseError,
} from '../resumeScreening';
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

const mockScreeningResponse = {
  screeningScore: 82,
  recommendation: 'GO',
  dimensions: {
    explicitSkillsMatch: { score: 90, details: 'Strong match on TypeScript, React' },
    implicitSkillsInferred: {
      score: 75,
      skills: ['Node.js', 'System Design'],
      details: 'Inferred from experience',
    },
    experienceRelevance: { score: 85, details: 'Directly relevant' },
    educationFit: { score: 80, details: 'CS degree matches' },
    culturalFit: { score: 78, details: 'Good cultural alignment' },
    salaryFit: { score: 70, details: 'Within range' },
  },
  matchedSkills: ['TypeScript', 'React'],
  missingSkills: ['Kubernetes'],
  inferredSkills: ['Node.js', 'System Design'],
  concerns: ['Limited DevOps experience'],
  strengths: ['Strong frontend expertise', 'Good communication'],
  screeningNotes: 'Solid candidate for the role',
  followUpQuestions: ['Describe your experience with CI/CD pipelines'],
};

const mockLLMResponse = {
  text: JSON.stringify(mockScreeningResponse),
  provider: 'openai',
  model: 'gpt-4',
  usage: { input: 500, output: 300, total: 800 },
  cost: 0.02,
  latencyMs: 1200,
};

const sampleJobCriteria = {
  title: 'Senior Frontend Engineer',
  requiredSkills: ['TypeScript', 'React'],
  preferredSkills: ['Node.js'],
  minExperienceYears: 3,
  educationLevel: 'Bachelor',
  location: 'Shanghai',
  isRemote: false,
  description: 'Build scalable frontend applications',
  salary: { min: 30000, max: 50000, currency: 'CNY' },
};

const sampleResumeText = `
John Doe
Senior Frontend Developer

Experience:
- 5 years at TechCorp building React applications
- Led frontend team of 4 engineers
- Built real-time collaboration features using WebSocket

Education: B.S. Computer Science, Peking University
Skills: TypeScript, React, JavaScript, HTML, CSS, Node.js
`;

describe('ResumeScreeningService', () => {
  let service: ResumeScreeningService;

  beforeEach(() => {
    service = new ResumeScreeningService();
    jest.clearAllMocks();
  });

  describe('screen', () => {
    it('should screen a single resume and return structured result', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue(mockLLMResponse);

      const request: ResumeScreeningRequest = {
        resumeText: sampleResumeText,
        jobCriteria: sampleJobCriteria,
      };

      const result = await service.screen(request);

      expect(result.screeningScore).toBe(82);
      expect(result.recommendation).toBe('GO');
      expect(result.matchedSkills).toEqual(['TypeScript', 'React']);
      expect(result.missingSkills).toEqual(['Kubernetes']);
      expect(result.inferredSkills).toEqual(['Node.js', 'System Design']);
      expect(result.concerns).toHaveLength(1);
      expect(result.strengths).toHaveLength(2);
      expect(result.followUpQuestions).toHaveLength(1);
      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.dimensions.explicitSkillsMatch.score).toBe(90);
    });

    it('should pass employer profile for cultural fit analysis', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue(mockLLMResponse);

      const request: ResumeScreeningRequest = {
        resumeText: sampleResumeText,
        jobCriteria: sampleJobCriteria,
        employerProfile: {
          companyName: 'TechCorp',
          culture: ['innovation', 'collaboration'],
          industry: 'Technology',
          size: '500-1000',
        },
      };

      const result = await service.screen(request);

      expect(llmService.generateText).toHaveBeenCalledTimes(1);
      const callArg = (llmService.generateText as jest.Mock).mock.calls[0][1];
      expect(callArg.temperature).toBe(0.2);
      expect(callArg.maxTokens).toBe(3000);

      // The prompt should include employer info
      const promptText = (llmService.generateText as jest.Mock).mock.calls[0][0];
      expect(promptText).toContain('TechCorp');
      expect(promptText).toContain('innovation');

      expect(result.dimensions.culturalFit).toBeDefined();
      expect(result.dimensions.culturalFit!.score).toBe(78);
    });

    it('should handle LLM errors gracefully', async () => {
      (llmService.generateText as jest.Mock).mockRejectedValue(new Error('LLM timeout'));

      const request: ResumeScreeningRequest = {
        resumeText: sampleResumeText,
        jobCriteria: sampleJobCriteria,
      };

      await expect(service.screen(request)).rejects.toThrow('LLM timeout');
    });

    it('should handle malformed LLM response with fallback', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: 'This is not JSON',
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 500,
      });

      const request: ResumeScreeningRequest = {
        resumeText: sampleResumeText,
        jobCriteria: sampleJobCriteria,
      };

      await expect(service.screen(request)).rejects.toThrow(LLMResponseParseError);
      await expect(service.screen(request)).rejects.toThrow('Failed to parse');
    });

    it('should use custom provider when specified', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: JSON.stringify(mockScreeningResponse),
        provider: 'claude',
        model: 'claude-3-opus',
        latencyMs: 800,
      });

      const request: ResumeScreeningRequest = {
        resumeText: sampleResumeText,
        jobCriteria: sampleJobCriteria,
        provider: 'claude',
      };

      const result = await service.screen(request);

      expect(llmService.generateText).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ provider: 'claude' })
      );
      expect(result.provider).toBe('claude');
    });
  });

  describe('screenBatch', () => {
    it('should screen multiple resumes in batch', async () => {
      const batchResponse = [
        {
          resumeId: 'r1',
          screeningScore: 85,
          recommendation: 'GO',
          matchedSkills: ['TypeScript'],
          missingSkills: [],
          concerns: [],
          screeningNotes: 'Good',
        },
        {
          resumeId: 'r2',
          screeningScore: 60,
          recommendation: 'HOLD',
          matchedSkills: [],
          missingSkills: ['React'],
          concerns: ['Limited experience'],
          screeningNotes: 'Average',
        },
      ];

      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: JSON.stringify(batchResponse),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 2000,
      });

      const request: BatchScreeningRequest = {
        resumes: [
          { id: 'r1', text: 'Resume 1 content' },
          { id: 'r2', text: 'Resume 2 content' },
        ],
        jobCriteria: sampleJobCriteria,
      };

      const result = await service.screenBatch(request);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].screeningScore).toBe(85);
      expect(result.results[1].screeningScore).toBe(60);
      expect(result.provider).toBe('openai');
    });
  });

  describe('screenAndRank', () => {
    it('should rank resumes by score (individual screening for small batches)', async () => {
      (llmService.generateText as jest.Mock)
        .mockResolvedValueOnce({
          text: JSON.stringify({
            ...mockScreeningResponse,
            screeningScore: 90,
            recommendation: 'STRONG_GO',
          }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 500,
        })
        .mockResolvedValueOnce({
          text: JSON.stringify({
            ...mockScreeningResponse,
            screeningScore: 65,
            recommendation: 'HOLD',
          }),
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 500,
        });

      const resumes = [
        { id: 'r1', text: 'Lower ranked resume' },
        { id: 'r2', text: 'Higher ranked resume' },
      ];

      const ranked = await service.screenAndRank(resumes, sampleJobCriteria);

      expect(ranked).toHaveLength(2);
      expect(ranked[0].result.screeningScore).toBe(90);
      expect(ranked[1].result.screeningScore).toBe(65);
    });

    it('should use batch screening for larger batches', async () => {
      const batchResponse = Array.from({ length: 6 }, (_, i) => ({
        resumeId: `r${i}`,
        screeningScore: 80 - i * 10,
        recommendation: i < 3 ? 'GO' : 'NO_GO',
        matchedSkills: ['TypeScript'],
        missingSkills: [],
        concerns: [],
        screeningNotes: `Resume ${i}`,
      }));

      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: JSON.stringify(batchResponse),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 3000,
      });

      const resumes = Array.from({ length: 6 }, (_, i) => ({
        id: `r${i}`,
        text: `Resume ${i} content`,
      }));

      const ranked = await service.screenAndRank(resumes, sampleJobCriteria);

      expect(ranked).toHaveLength(6);
      expect(ranked[0].result.screeningScore).toBeGreaterThanOrEqual(
        ranked[ranked.length - 1].result.screeningScore
      );
    });
  });

  describe('explainRecommendation', () => {
    it('should generate recommendation explanation', async () => {
      const explanationResponse = {
        summary: 'The candidate is a strong match for the Senior Frontend role.',
        matchingReasons: ['5 years of React experience', 'TypeScript expertise'],
        skillAlignment: {
          matched: ['TypeScript', 'React'],
          gaps: ['Kubernetes'],
        },
        careerFit: 'Strong upward trajectory',
        recommendedNextSteps: [
          'Schedule technical interview',
          'Ask about system design experience',
        ],
      };

      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: JSON.stringify(explanationResponse),
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 600,
      });

      const result = await service.explainRecommendation(
        {
          name: 'John Doe',
          skills: ['TypeScript', 'React'],
          experienceYears: 5,
          title: 'Frontend Developer',
        },
        {
          title: 'Senior Frontend Engineer',
          requiredSkills: ['TypeScript', 'React'],
          companyName: 'TechCorp',
        },
        82
      );

      expect(result.summary).toBe('The candidate is a strong match for the Senior Frontend role.');
      expect(result.matchingReasons).toHaveLength(2);
      expect(result.skillAlignment.matched).toEqual(['TypeScript', 'React']);
      expect(result.recommendedNextSteps).toHaveLength(2);
    });

    it('should handle malformed explanation response', async () => {
      (llmService.generateText as jest.Mock).mockResolvedValue({
        text: 'Plain text response',
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 300,
      });

      await expect(
        service.explainRecommendation(
          { skills: ['React'], experienceYears: 3 },
          { title: 'Engineer', requiredSkills: ['React'] },
          70
        )
      ).rejects.toThrow(LLMResponseParseError);
    });
  });
});
