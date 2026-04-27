/**
 * Conversation Report Service Tests
 * 会话报告生成服务测试 (ISSUE-DATE003 c4)
 */

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../llmService', () => ({
  llmService: null,
}));

import {
  ConversationReportService,
  SessionData,
  QualityAssessment,
} from '../conversationReportService';

describe('ConversationReportService', () => {
  let service: ConversationReportService;

  const mockSessionData: SessionData = {
    roomId: 'room-123',
    agentAId: 'agent-a',
    agentBId: 'agent-b',
    userIdA: 'user-a',
    userIdB: 'user-b',
    messages: [
      {
        id: 'msg-1',
        senderId: 'agent-a',
        content: '你好，很高兴认识你！',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        round: 1,
      },
      {
        id: 'msg-2',
        senderId: 'agent-b',
        content: '你好！我也很高兴认识你。你平时有什么兴趣爱好吗？',
        timestamp: new Date('2024-01-01T10:01:00Z'),
        round: 1,
      },
      {
        id: 'msg-3',
        senderId: 'agent-a',
        content: '我喜欢旅游和摄影，你呢？',
        timestamp: new Date('2024-01-01T10:02:00Z'),
        round: 2,
      },
      {
        id: 'msg-4',
        senderId: 'agent-b',
        content: '我也喜欢旅游！我们都去过很多城市，你最喜欢哪里？',
        timestamp: new Date('2024-01-01T10:03:00Z'),
        round: 2,
      },
      {
        id: 'msg-5',
        senderId: 'agent-a',
        content: '我最喜欢大理，那里的风景特别美。你有什么美食推荐吗？',
        timestamp: new Date('2024-01-01T10:04:00Z'),
        round: 3,
      },
    ],
    startTime: new Date('2024-01-01T10:00:00Z'),
    endTime: new Date('2024-01-01T10:10:00Z'),
    matchScore: 65,
  };

  const mockQualityAssessments: QualityAssessment[] = [
    { round: 1, fluency: 0.8, engagement: 0.7, depth: 0.5 },
    { round: 2, fluency: 0.85, engagement: 0.8, depth: 0.6 },
    { round: 3, fluency: 0.75, engagement: 0.85, depth: 0.7 },
  ];

  beforeEach(() => {
    service = new ConversationReportService();
  });

  describe('ConversationReportService instantiation', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });

    it('should have version', () => {
      const version = service.getVersion();
      expect(version).toBe('1.0.0');
    });
  });

  describe('generateReport', () => {
    it('should create report from session data', async () => {
      const report = await service.generateReport(
        'room-123',
        mockSessionData,
        mockQualityAssessments
      );

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.roomId).toBe('room-123');
      expect(report.agentAId).toBe('agent-a');
      expect(report.agentBId).toBe('agent-b');
      expect(report.userIdA).toBe('user-a');
      expect(report.userIdB).toBe('user-b');
      expect(report.summary).toBeDefined();
      expect(typeof report.summary).toBe('string');
      expect(report.createdAt).toBeInstanceOf(Date);
    });

    it('should calculate compatibility score', async () => {
      const report = await service.generateReport(
        'room-123',
        mockSessionData,
        mockQualityAssessments
      );

      expect(report.compatibilityScore).toBeGreaterThanOrEqual(0);
      expect(report.compatibilityScore).toBeLessThanOrEqual(100);
    });

    it('should calculate score change from previous match score', async () => {
      const report = await service.generateReport(
        'room-123',
        mockSessionData,
        mockQualityAssessments
      );

      expect(report.previousMatchScore).toBe(mockSessionData.matchScore);
      expect(report.scoreChange).toBe(report.compatibilityScore - report.previousMatchScore);
    });

    it('should include quality metrics', async () => {
      const report = await service.generateReport(
        'room-123',
        mockSessionData,
        mockQualityAssessments
      );

      expect(report.qualityMetrics).toBeDefined();
      expect(report.qualityMetrics.fluency).toBeGreaterThanOrEqual(0);
      expect(report.qualityMetrics.fluency).toBeLessThanOrEqual(1);
      expect(report.qualityMetrics.engagement).toBeGreaterThanOrEqual(0);
      expect(report.qualityMetrics.engagement).toBeLessThanOrEqual(1);
      expect(report.qualityMetrics.depth).toBeGreaterThanOrEqual(0);
      expect(report.qualityMetrics.depth).toBeLessThanOrEqual(1);
    });

    it('should include duration and rounds', async () => {
      const report = await service.generateReport(
        'room-123',
        mockSessionData,
        mockQualityAssessments
      );

      expect(report.duration).toBeGreaterThan(0);
      expect(report.totalRounds).toBe(mockSessionData.messages.length);
    });

    it('should extract shared interests', async () => {
      const report = await service.generateReport(
        'room-123',
        mockSessionData,
        mockQualityAssessments
      );

      expect(report.sharedInterests).toBeDefined();
      expect(Array.isArray(report.sharedInterests)).toBe(true);
    });

    it('should generate suggestions', async () => {
      const report = await service.generateReport(
        'room-123',
        mockSessionData,
        mockQualityAssessments
      );

      expect(report.suggestions).toBeDefined();
      expect(Array.isArray(report.suggestions)).toBe(true);
      expect(report.suggestions.length).toBeGreaterThan(0);
    });

    it('should include highlights', async () => {
      const report = await service.generateReport(
        'room-123',
        mockSessionData,
        mockQualityAssessments
      );

      expect(report.highlights).toBeDefined();
      expect(Array.isArray(report.highlights)).toBe(true);
    });

    it('should include topic summaries', async () => {
      const report = await service.generateReport(
        'room-123',
        mockSessionData,
        mockQualityAssessments
      );

      expect(report.topics).toBeDefined();
      expect(Array.isArray(report.topics)).toBe(true);
    });

    it('should handle empty messages', async () => {
      const emptySession: SessionData = {
        ...mockSessionData,
        messages: [],
      };

      const report = await service.generateReport('room-empty', emptySession, []);

      expect(report).toBeDefined();
      expect(report.summary).toBe('会话内容为空');
    });

    it('should use previous match score when not provided', async () => {
      const sessionWithoutScore: SessionData = {
        ...mockSessionData,
        matchScore: undefined,
      };

      const report = await service.generateReport(
        'room-no-score',
        sessionWithoutScore,
        mockQualityAssessments
      );

      expect(report.previousMatchScore).toBe(report.compatibilityScore);
      expect(report.scoreChange).toBe(0);
    });

    it('should calculate quality metrics from assessments', async () => {
      const report = await service.generateReport(
        'room-123',
        mockSessionData,
        mockQualityAssessments
      );

      // Average of the assessments
      const expectedFluency = (0.8 + 0.85 + 0.75) / 3;
      const expectedEngagement = (0.7 + 0.8 + 0.85) / 3;
      const expectedDepth = (0.5 + 0.6 + 0.7) / 3;

      expect(report.qualityMetrics.fluency).toBeCloseTo(expectedFluency, 2);
      expect(report.qualityMetrics.engagement).toBeCloseTo(expectedEngagement, 2);
      expect(report.qualityMetrics.depth).toBeCloseTo(expectedDepth, 2);
    });
  });

  describe('getReport', () => {
    it('should return report by id', async () => {
      const generated = await service.generateReport(
        'room-123',
        mockSessionData,
        mockQualityAssessments
      );

      const report = await service.getReport(generated.id);

      expect(report).toBeDefined();
      expect(report?.id).toBe(generated.id);
    });

    it('should return null for non-existent report', async () => {
      const report = await service.getReport('non-existent-id');

      expect(report).toBeNull();
    });
  });

  describe('getReportsByUser', () => {
    it('should return reports for user A', async () => {
      await service.generateReport('room-1', mockSessionData, mockQualityAssessments);
      await service.generateReport('room-2', mockSessionData, mockQualityAssessments);

      const reports = await service.getReportsByUser('user-a');

      expect(reports.length).toBeGreaterThanOrEqual(1);
      reports.forEach(report => {
        expect(report.userIdA === 'user-a' || report.userIdB === 'user-a').toBe(true);
      });
    });

    it('should return reports for user B', async () => {
      await service.generateReport('room-1', mockSessionData, mockQualityAssessments);

      const reports = await service.getReportsByUser('user-b');

      expect(reports.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for user with no reports', async () => {
      const reports = await service.getReportsByUser('non-existent-user');

      expect(reports).toEqual([]);
    });

    it('should return reports sorted by creation time descending', async () => {
      // Create multiple reports
      await service.generateReport('room-1', mockSessionData, mockQualityAssessments);
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.generateReport('room-2', mockSessionData, mockQualityAssessments);

      const reports = await service.getReportsByUser('user-a');

      for (let i = 1; i < reports.length; i++) {
        expect(reports[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
          reports[i].createdAt.getTime()
        );
      }
    });
  });
});
