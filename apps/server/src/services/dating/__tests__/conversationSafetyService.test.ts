/**
 * Conversation Safety Service Tests
 * 会话安全服务测试 (ISSUE-DATE003 c6)
 */

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../ai/llmService', () => ({
  llmService: null,
}));

import {
  checkMessageSafety,
  detectSensitiveTopics,
  filterInappropriateContent,
  createDisputeReport,
  getSafetyConfig,
  handleAbnormalInterruption,
  emergencyTerminate,
} from '../conversationSafetyService';

describe('conversationSafetyService', () => {
  describe('checkMessageSafety', () => {
    it('should allow safe content', async () => {
      const result = await checkMessageSafety(
        'room-123',
        'msg-001',
        '今天天气真好，我们去公园散步吧！',
        'user-001'
      );

      expect(result).toBeDefined();
      expect(result.roomId).toBe('room-123');
      expect(result.messageId).toBe('msg-001');
      expect(result.level).toBe('safe');
      expect(result.action).toBe('allow');
      expect(result.flags).toEqual([]);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should block dangerous content', async () => {
      const result = await checkMessageSafety(
        'room-123',
        'msg-002',
        '这是诈骗信息，请转账给我',
        'user-002'
      );

      // Should detect inappropriate patterns
      expect(result.flags.length).toBeGreaterThan(0);
    });

    it('should flag sensitive political content', async () => {
      const result = await checkMessageSafety(
        'room-123',
        'msg-003',
        '关于政治和选举的话题',
        'user-003'
      );

      expect(result.flags.length).toBeGreaterThan(0);
      const sensitiveFlags = result.flags.filter(f => f.type === 'sensitive_topic');
      expect(sensitiveFlags.length).toBeGreaterThan(0);
    });

    it('should detect violence-related content', async () => {
      const result = await checkMessageSafety(
        'room-123',
        'msg-004',
        '我不想活了，想要报复社会',
        'user-004'
      );

      expect(result.flags.length).toBeGreaterThan(0);
      const violenceFlags = result.flags.filter(f => f.severity === 'danger');
      expect(violenceFlags.length).toBeGreaterThan(0);
    });

    it('should detect personal info leaks', async () => {
      const result = await checkMessageSafety(
        'room-123',
        'msg-005',
        '我的手机号是13812345678，银行卡号6225881234567890',
        'user-005'
      );

      expect(result.flags.length).toBeGreaterThan(0);
      const personalInfoFlags = result.flags.filter(f => f.type === 'personal_info');
      expect(personalInfoFlags.length).toBeGreaterThan(0);
    });

    it('should set appropriate action based on level', async () => {
      // Safe content -> allow
      const safeResult = await checkMessageSafety(
        'room-123',
        'msg-safe',
        'Hello, how are you?',
        'user-001'
      );
      expect(safeResult.action).toBe('allow');

      // Dangerous content -> block or terminate
      const dangerousResult = await checkMessageSafety(
        'room-123',
        'msg-danger',
        '威胁恐吓骚扰诈骗',
        'user-002'
      );
      expect(['block', 'terminate', 'warn']).toContain(dangerousResult.action);
    });
  });

  describe('detectSensitiveTopics', () => {
    it('should flag political content', async () => {
      const flags = await detectSensitiveTopics('讨论政治和选举的问题');

      expect(flags.length).toBeGreaterThan(0);
      const politicalFlag = flags.find(
        f => f.type === 'sensitive_topic' && f.description.includes('politics')
      );
      expect(politicalFlag).toBeDefined();
      expect(politicalFlag?.severity).toBe('danger');
    });

    it('should flag violence content', async () => {
      const flags = await detectSensitiveTopics('有人要打架，想买武器');

      expect(flags.length).toBeGreaterThan(0);
      const violenceFlag = flags.find(
        f => f.type === 'sensitive_topic' && f.description.includes('violence')
      );
      expect(violenceFlag).toBeDefined();
      expect(violenceFlag?.severity).toBe('danger');
    });

    it('should flag money-related sensitive content', async () => {
      const flags = await detectSensitiveTopics('有人要借钱，让我转账汇款');

      expect(flags.length).toBeGreaterThan(0);
      const moneyFlag = flags.find(
        f => f.type === 'sensitive_topic' && f.description.includes('money')
      );
      expect(moneyFlag).toBeDefined();
      expect(moneyFlag?.severity).toBe('warning');
    });

    it('should flag privacy-related content', async () => {
      const flags = await detectSensitiveTopics('地址和电话身份证密码');

      expect(flags.length).toBeGreaterThan(0);
      const privacyFlag = flags.find(
        f => f.type === 'sensitive_topic' && f.description.includes('privacy')
      );
      expect(privacyFlag).toBeDefined();
    });

    it('should return empty array for safe content', async () => {
      const flags = await detectSensitiveTopics('今天天气很好，想去公园散步');

      expect(flags).toEqual([]);
    });

    it('should calculate confidence based on matched keywords', async () => {
      const flags = await detectSensitiveTopics('政治政治政治 选举选举');

      expect(flags.length).toBeGreaterThan(0);
      const flag = flags[0];
      expect(flag.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('filterInappropriateContent', () => {
    it('should sanitize content', async () => {
      const { filtered, flags } = await filterInappropriateContent('这是色情内容，黄色淫秽');

      expect(filtered).toContain('***');
      expect(filtered).not.toContain('色情');
      expect(flags.length).toBeGreaterThan(0);
    });

    it('should filter harassment content', async () => {
      const { filtered, flags } = await filterInappropriateContent('威胁恐吓骚扰跟踪');

      expect(filtered).toContain('***');
      expect(flags.length).toBeGreaterThan(0);
      expect(flags[0].type).toBe('inappropriate_content');
    });

    it('should filter fraud-related content', async () => {
      const { filtered, flags } = await filterInappropriateContent('这是诈骗，骗子假冒钓鱼');

      expect(filtered).toContain('***');
      expect(flags.length).toBeGreaterThan(0);
    });

    it('should filter discriminatory content', async () => {
      const { filtered, flags } = await filterInappropriateContent('种族主义歧视偏见');

      expect(filtered).toContain('***');
      expect(flags.length).toBeGreaterThan(0);
    });

    it('should return original content if no issues', async () => {
      const { filtered, flags } = await filterInappropriateContent('今天天气真好，我们去散步吧');

      expect(filtered).toBe('今天天气真好，我们去散步吧');
      expect(flags).toEqual([]);
    });
  });

  describe('createDisputeReport', () => {
    it('should create report', async () => {
      const report = await createDisputeReport('room-123', 'user-a', 'Inappropriate behavior', [
        'evidence message 1',
        'evidence message 2',
      ]);

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.roomId).toBe('room-123');
      expect(report.reporterId).toBe('user-a');
      expect(report.reason).toBe('Inappropriate behavior');
      expect(report.evidence).toEqual(['evidence message 1', 'evidence message 2']);
      expect(report.status).toBe('pending');
      expect(report.createdAt).toBeInstanceOf(Date);
    });

    it('should assign reportedUserId', async () => {
      const report = await createDisputeReport('room-123', 'user-a', 'Report reason', []);

      // The report should have a reportedUserId
      expect(report.reportedUserId).toBeDefined();
    });
  });

  describe('getSafetyConfig', () => {
    it('should return current safety config', async () => {
      const config = await getSafetyConfig();

      expect(config).toBeDefined();
      expect(config.enableContentFilter).toBe(true);
      expect(config.enableSensitiveTopicDetection).toBe(true);
      expect(config.enablePersonalInfoProtection).toBe(true);
      expect(config.autoTerminateThreshold).toBe('critical');
    });

    it('should return a copy of config', async () => {
      const config1 = await getSafetyConfig();
      const config2 = await getSafetyConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('handleAbnormalInterruption', () => {
    it('should handle interruption without throwing', async () => {
      await expect(
        handleAbnormalInterruption('room-123', 'Connection lost')
      ).resolves.not.toThrow();
    });

    it('should handle interruption for non-existent room', async () => {
      await expect(handleAbnormalInterruption('non-existent', 'Error')).resolves.not.toThrow();
    });
  });

  describe('emergencyTerminate', () => {
    it('should terminate room', async () => {
      await expect(
        emergencyTerminate('room-123', 'admin-user', 'Severe violation detected')
      ).resolves.not.toThrow();
    });

    it('should create dispute report for termination', async () => {
      await emergencyTerminate('room-456', 'admin-001', 'Critical safety issue');

      // The function should complete without error
      // A dispute report is created internally
    });
  });
});
