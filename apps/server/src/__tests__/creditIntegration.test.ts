/**
 * Cross-Module Credit Integration Tests
 * ISSUE-INT001c: 跨模块集成与测试框架基础设施
 * Tests C005~c1 (信用筛选) and C005~c2 (门槛设置)
 */

import {
  CreditLevel,
  CREDIT_LEVEL_THRESHOLDS,
} from '@bridgeai/shared';

import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import {
  CreditFilterOptions,
  getCreditLevel,
  buildCreditFilterCondition,
  filterAgentsByCredit,
  checkCreditThreshold,
} from '../services/creditFilterService';
import {
  getSceneThreshold,
  updateSceneThreshold,
  addExemptionRule,
  removeExemptionRule,
  isUserExempted,
  checkSceneCreditThreshold,
  getThresholdChangeNotification,
  getInsufficientCreditNotification,
  resetSceneThresholds,
  ExemptionRule,
} from '../config/creditThresholds';

// Mock Prisma
jest.mock('../db/client', () => ({
  prisma: {
    agent: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    creditScore: {
      findMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('ISSUE-C005~c1: 信用筛选 Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSceneThresholds();
  });

  // ===== 最低信用分设置 (Minimum Credit Score Setting) =====
  describe('最低信用分设置 (Minimum Credit Score)', () => {
    it('should filter agents with credit score >= minimum threshold', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1', type: 'VISIONSHARE', user: { creditScore: { score: 700 } } },
        { id: 'agent-2', name: 'Agent 2', type: 'VISIONSHARE', user: { creditScore: { score: 650 } } },
        { id: 'agent-3', name: 'Agent 3', type: 'VISIONSHARE', user: { creditScore: { score: 550 } } },
      ];

      (prisma.agent.findMany as jest.Mock).mockResolvedValue(mockAgents.slice(0, 2));
      (prisma.agent.count as jest.Mock).mockResolvedValue(2);

      const result = await filterAgentsByCredit({ minCreditScore: 600 });

      expect(result.total).toBe(2);
      expect(result.items.every(a => a.creditScore! >= 600)).toBe(true);
    });

    it('should exclude agents below minimum credit score', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1', type: 'VISIONSHARE', user: { creditScore: { score: 700 } } },
        { id: 'agent-2', name: 'Agent 2', type: 'VISIONSHARE', user: { creditScore: { score: 550 } } },
      ];

      (prisma.agent.findMany as jest.Mock).mockResolvedValue([mockAgents[0]]);
      (prisma.agent.count as jest.Mock).mockResolvedValue(1);

      const result = await filterAgentsByCredit({ minCreditScore: 600 });

      expect(result.total).toBe(1);
      expect(result.items[0].creditScore).toBe(700);
    });

    it('should build correct Prisma condition for minimum score', () => {
      const options: CreditFilterOptions = { minCreditScore: 600 };
      const condition = buildCreditFilterCondition(options);

      expect(condition).toEqual({
        user: {
          creditScore: {
            score: { gte: 600 },
          },
        },
      });
    });

    it('should handle edge case at minimum score boundary', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1', type: 'VISIONSHARE', user: { creditScore: { score: 600 } } },
      ];

      (prisma.agent.findMany as jest.Mock).mockResolvedValue(mockAgents);
      (prisma.agent.count as jest.Mock).mockResolvedValue(1);

      const result = await filterAgentsByCredit({ minCreditScore: 600 });
      expect(result.total).toBe(1);
      expect(result.items[0].creditScore).toBe(600);
    });
  });

  // ===== 信用分范围筛选 (Credit Score Range Filtering) =====
  describe('信用分范围筛选 (Credit Score Range Filtering)', () => {
    it('should filter agents within specified score range', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1', type: 'VISIONSHARE', user: { creditScore: { score: 700 } } },
        { id: 'agent-2', name: 'Agent 2', type: 'VISIONSHARE', user: { creditScore: { score: 650 } } },
      ];

      (prisma.agent.findMany as jest.Mock).mockResolvedValue(mockAgents);
      (prisma.agent.count as jest.Mock).mockResolvedValue(2);

      const result = await filterAgentsByCredit({ minCreditScore: 600, maxCreditScore: 750 });

      expect(result.total).toBe(2);
      expect(result.items.every(a => a.creditScore! >= 600 && a.creditScore! <= 750)).toBe(true);
    });

    it('should build correct Prisma condition for score range', () => {
      const options: CreditFilterOptions = { minCreditScore: 600, maxCreditScore: 750 };
      const condition = buildCreditFilterCondition(options);

      expect(condition).toEqual({
        user: {
          creditScore: {
            score: { gte: 600, lte: 750 },
          },
        },
      });
    });

    it('should filter agents within excellent range (800-1000)', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1', type: 'VISIONSHARE', user: { creditScore: { score: 850 } } },
        { id: 'agent-2', name: 'Agent 2', type: 'VISIONSHARE', user: { creditScore: { score: 900 } } },
      ];

      (prisma.agent.findMany as jest.Mock).mockResolvedValue(mockAgents);
      (prisma.agent.count as jest.Mock).mockResolvedValue(2);

      const result = await filterAgentsByCredit({ minCreditScore: 800, maxCreditScore: 1000 });

      expect(result.total).toBe(2);
      expect(result.items.every(a => a.creditLevel === 'excellent')).toBe(true);
    });

    it('should handle narrow range filtering', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1', type: 'VISIONSHARE', user: { creditScore: { score: 600 } } },
      ];

      (prisma.agent.findMany as jest.Mock).mockResolvedValue(mockAgents);
      (prisma.agent.count as jest.Mock).mockResolvedValue(1);

      const result = await filterAgentsByCredit({ minCreditScore: 600, maxCreditScore: 600 });

      expect(result.total).toBe(1);
      expect(result.items[0].creditScore).toBe(600);
    });
  });

  // ===== 信用等级筛选 (Credit Level Filtering) =====
  describe('信用等级筛选 (Credit Level Filtering)', () => {
    it('should filter by excellent level', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1', type: 'VISIONSHARE', user: { creditScore: { score: 850 } } },
        { id: 'agent-2', name: 'Agent 2', type: 'VISIONSHARE', user: { creditScore: { score: 650 } } },
      ];

      (prisma.agent.findMany as jest.Mock).mockResolvedValue([mockAgents[0]]);
      (prisma.agent.count as jest.Mock).mockResolvedValue(1);

      const result = await filterAgentsByCredit({ creditLevel: 'excellent' });

      expect(result.total).toBe(1);
      expect(result.items[0].creditLevel).toBe('excellent');
      expect(result.items[0].creditScore).toBe(850);
    });

    it('should filter by good level', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1', type: 'VISIONSHARE', user: { creditScore: { score: 700 } } },
        { id: 'agent-2', name: 'Agent 2', type: 'VISIONSHARE', user: { creditScore: { score: 500 } } },
      ];

      (prisma.agent.findMany as jest.Mock).mockResolvedValue([mockAgents[0]]);
      (prisma.agent.count as jest.Mock).mockResolvedValue(1);

      const result = await filterAgentsByCredit({ creditLevel: 'good' });

      expect(result.total).toBe(1);
      expect(result.items[0].creditLevel).toBe('good');
      expect(result.items[0].creditScore).toBe(700);
    });

    it('should filter by average level', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1', type: 'VISIONSHARE', user: { creditScore: { score: 500 } } },
        { id: 'agent-2', name: 'Agent 2', type: 'VISIONSHARE', user: { creditScore: { score: 700 } } },
      ];

      (prisma.agent.findMany as jest.Mock).mockResolvedValue([mockAgents[0]]);
      (prisma.agent.count as jest.Mock).mockResolvedValue(1);

      const result = await filterAgentsByCredit({ creditLevel: 'average' });

      expect(result.total).toBe(1);
      expect(result.items[0].creditLevel).toBe('average');
      expect(result.items[0].creditScore).toBe(500);
    });

    it('should filter by multiple credit levels', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1', type: 'VISIONSHARE', user: { creditScore: { score: 850 } } },
        { id: 'agent-2', name: 'Agent 2', type: 'VISIONSHARE', user: { creditScore: { score: 700 } } },
        { id: 'agent-3', name: 'Agent 3', type: 'VISIONSHARE', user: { creditScore: { score: 500 } } },
      ];

      (prisma.agent.findMany as jest.Mock).mockResolvedValue(mockAgents.slice(0, 2));
      (prisma.agent.count as jest.Mock).mockResolvedValue(2);

      const result = await filterAgentsByCredit({ creditLevel: ['excellent', 'good'] });

      expect(result.total).toBe(2);
      expect(result.items.every(a => a.creditLevel === 'excellent' || a.creditLevel === 'good')).toBe(true);
    });

    it('should build correct OR condition for multiple levels', () => {
      const options: CreditFilterOptions = { creditLevel: ['excellent', 'good'] };
      const condition = buildCreditFilterCondition(options);

      expect(condition).toEqual({
        OR: [
          {
            user: {
              creditScore: {
                score: { gte: 800, lte: 1000 },
              },
            },
          },
          {
            user: {
              creditScore: {
                score: { gte: 600, lte: 799 },
              },
            },
          },
        ],
      });
    });

    it('should get correct credit level from score', () => {
      expect(getCreditLevel(850)).toBe('excellent');
      expect(getCreditLevel(700)).toBe('good');
      expect(getCreditLevel(500)).toBe('average');
      expect(getCreditLevel(300)).toBe('poor');
    });

    it('should have correct thresholds from shared config', () => {
      expect(CREDIT_LEVEL_THRESHOLDS.excellent).toEqual({ min: 800, max: 1000 });
      expect(CREDIT_LEVEL_THRESHOLDS.good).toEqual({ min: 600, max: 799 });
      expect(CREDIT_LEVEL_THRESHOLDS.average).toEqual({ min: 400, max: 599 });
      expect(CREDIT_LEVEL_THRESHOLDS.poor).toEqual({ min: 0, max: 399 });
    });
  });

  // ===== 无信用分处理 (Handling No Credit Score) =====
  describe('无信用分处理 (No Credit Score Handling)', () => {
    it('should exclude agents without credit score by default', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1', type: 'VISIONSHARE', user: { creditScore: { score: 700 } } },
        { id: 'agent-2', name: 'Agent 2', type: 'VISIONSHARE', user: { creditScore: null } },
      ];

      (prisma.agent.findMany as jest.Mock).mockResolvedValue([mockAgents[0]]);
      (prisma.agent.count as jest.Mock).mockResolvedValue(1);

      const result = await filterAgentsByCredit({ minCreditScore: 600 });

      expect(result.total).toBe(1);
      expect(result.items[0].creditScore).toBe(700);
    });

    it('should include agents without credit score when includeNoCredit=true', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1', type: 'VISIONSHARE', user: { creditScore: null } },
      ];

      (prisma.agent.findMany as jest.Mock).mockResolvedValue(mockAgents);
      (prisma.agent.count as jest.Mock).mockResolvedValue(1);

      const result = await filterAgentsByCredit({ includeNoCredit: true });

      expect(result.total).toBe(1);
      expect(result.items[0].creditScore).toBeNull();
      expect(result.items[0].creditLevel).toBeNull();
    });

    it('should build condition to include no-credit agents', () => {
      const options: CreditFilterOptions = { includeNoCredit: true };
      const condition = buildCreditFilterCondition(options);

      expect(condition).toEqual({
        user: {
          creditScore: {
            is: null,
          },
        },
      });
    });

    it('should combine min score with includeNoCredit', () => {
      const options: CreditFilterOptions = { minCreditScore: 600, includeNoCredit: true };
      const condition = buildCreditFilterCondition(options);

      expect(condition).toEqual({
        OR: [
          { user: { creditScore: { score: { gte: 600 } } } },
          { user: { creditScore: { is: null } } },
        ],
      });
    });

    it('should handle threshold check for agent without credit score', async () => {
      const mockAgent = {
        id: 'agent-1',
        user: { creditScore: null },
      };

      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);

      const result = await checkCreditThreshold('agent-1', 600);

      expect(result.meetsThreshold).toBe(false);
      expect(result.agentScore).toBeNull();
      expect(result.agentLevel).toBeNull();
      expect(result.gap).toBe(600);
    });

    it('should return null credit level for agents without score', () => {
      expect(getCreditLevel(null)).toBeNull();
      expect(getCreditLevel(undefined)).toBeNull();
    });
  });
});

describe('ISSUE-C005~c2: 门槛设置 Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSceneThresholds();
  });

  // ===== 场景特定的信用门槛 (Scene-Specific Credit Thresholds) =====
  describe('场景特定的信用门槛 (Scene-Specific Thresholds)', () => {
    it('should have default thresholds for all major scenes', () => {
      const visionshare = getSceneThreshold('visionshare');
      const agentdate = getSceneThreshold('agentdate');
      const agentjob = getSceneThreshold('agentjob');
      const agentad = getSceneThreshold('agentad');

      expect(visionshare).toBeDefined();
      expect(visionshare?.minCreditScore).toBe(500);
      expect(visionshare?.minCreditLevel).toBe('average');

      expect(agentdate).toBeDefined();
      expect(agentdate?.minCreditScore).toBe(600);
      expect(agentdate?.minCreditLevel).toBe('good');

      expect(agentjob).toBeDefined();
      expect(agentjob?.minCreditScore).toBe(400);
      expect(agentjob?.minCreditLevel).toBe('average');

      expect(agentad).toBeDefined();
      expect(agentad?.minCreditScore).toBe(500);
      expect(agentad?.minCreditLevel).toBe('average');
    });

    it('should enforce higher threshold for agentdate scene', async () => {
      const mockAgent = {
        id: 'agent-1',
        user: { creditScore: { score: 550 } },
      };

      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);

      const result = await checkCreditThreshold('agent-1', 600);

      expect(result.meetsThreshold).toBe(false);
      expect(result.agentScore).toBe(550);
    });

    it('scene thresholds should be active by default', () => {
      const visionshare = getSceneThreshold('visionshare');
      expect(visionshare?.isActive).toBe(true);

      const agentdate = getSceneThreshold('agentdate');
      expect(agentdate?.isActive).toBe(true);
    });

    it('should return undefined for non-existent scene', () => {
      const nonexistent = getSceneThreshold('nonexistent');
      expect(nonexistent).toBeUndefined();
    });
  });

  // ===== 动态门槛调整 (Dynamic Threshold Adjustment) =====
  describe('动态门槛调整 (Dynamic Threshold Adjustment)', () => {
    it('should update scene threshold dynamically', () => {
      const updated = updateSceneThreshold('visionshare', { minCreditScore: 700 });

      expect(updated).toBeDefined();
      expect(updated?.minCreditScore).toBe(700);
      expect(updated?.sceneId).toBe('visionshare');
      expect(updated?.sceneName).toBe('视觉分享');
    });

    it('should preserve other fields when updating threshold', () => {
      const before = getSceneThreshold('visionshare');
      const updated = updateSceneThreshold('visionshare', { minCreditScore: 750 });

      expect(updated?.sceneId).toBe(before?.sceneId);
      expect(updated?.sceneName).toBe(before?.sceneName);
      expect(updated?.isActive).toBe(before?.isActive);
      expect(updated?.minCreditLevel).toBe(before?.minCreditLevel);
    });

    it('should update threshold and get notification', () => {
      const oldThreshold = 500;
      const newThreshold = 700;

      const updated = updateSceneThreshold('visionshare', { minCreditScore: newThreshold });
      const notification = getThresholdChangeNotification('visionshare', oldThreshold, newThreshold);

      expect(updated?.minCreditScore).toBe(700);
      expect(notification.title).toContain('提高');
      expect(notification.message).toContain('500');
      expect(notification.message).toContain('700');
    });

    it('should return notification for threshold decrease', () => {
      const notification = getThresholdChangeNotification('visionshare', 700, 500);

      expect(notification.title).toContain('降低');
      expect(notification.message).toContain('500');
    });

    it('should return undefined for updating non-existent scene', () => {
      const updated = updateSceneThreshold('nonexistent', { minCreditScore: 700 });
      expect(updated).toBeUndefined();
    });

    it('should update minCreditLevel with threshold', () => {
      const updated = updateSceneThreshold('visionshare', {
        minCreditScore: 850,
        minCreditLevel: 'excellent',
      });

      expect(updated?.minCreditScore).toBe(850);
      expect(updated?.minCreditLevel).toBe('excellent');
    });

    it('should toggle threshold active status', () => {
      const updated = updateSceneThreshold('visionshare', { isActive: false });
      expect(updated?.isActive).toBe(false);

      const reactivated = updateSceneThreshold('visionshare', { isActive: true });
      expect(reactivated?.isActive).toBe(true);
    });
  });

  // ===== 门槛豁免机制 (Threshold Exemption Mechanism) =====
  describe('门槛豁免机制 (Threshold Exemption Mechanism)', () => {
    it('should grant user exemption', () => {
      const rule = addExemptionRule('visionshare', {
        name: 'VIP User',
        type: 'user',
        targetIds: ['user-123'],
        reason: 'VIP customer',
      });

      expect(rule).toBeDefined();
      expect(rule?.id).toBeDefined();
      expect(rule?.type).toBe('user');
      expect(rule?.name).toBe('VIP User');
    });

    it('should grant agent exemption', () => {
      const rule = addExemptionRule('visionshare', {
        name: 'Trusted Agent',
        type: 'agent',
        targetIds: ['agent-456'],
      });

      expect(rule?.type).toBe('agent');
      expect(rule?.targetIds).toContain('agent-456');
    });

    it('should grant promotion exemption (applies to all)', () => {
      const rule = addExemptionRule('visionshare', {
        name: 'New Year Promotion',
        type: 'promotion',
      });

      expect(rule?.type).toBe('promotion');
    });

    it('should check if user is exempted', () => {
      addExemptionRule('visionshare', {
        name: 'VIP User',
        type: 'user',
        targetIds: ['user-123'],
      });

      const result = isUserExempted('visionshare', 'user-123');
      expect(result.exempted).toBe(true);
      expect(result.rule?.name).toBe('VIP User');
    });

    it('should return false for non-exempted user', () => {
      const result = isUserExempted('visionshare', 'user-999');
      expect(result.exempted).toBe(false);
      expect(result.rule).toBeUndefined();
    });

    it('should skip expired exemptions', () => {
      addExemptionRule('visionshare', {
        name: 'Expired Exemption',
        type: 'user',
        targetIds: ['user-123'],
        validUntil: new Date('2020-01-01'),
      });

      const result = isUserExempted('visionshare', 'user-123');
      expect(result.exempted).toBe(false);
    });

    it('should keep valid exemptions', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      addExemptionRule('visionshare', {
        name: 'Valid Exemption',
        type: 'user',
        targetIds: ['user-123'],
        validUntil: futureDate,
      });

      const result = isUserExempted('visionshare', 'user-123');
      expect(result.exempted).toBe(true);
    });

    it('should remove exemption rule', () => {
      const rule = addExemptionRule('visionshare', {
        name: 'Temporary Exemption',
        type: 'user',
        targetIds: ['user-123'],
      });

      const removed = removeExemptionRule('visionshare', rule!.id);
      expect(removed).toBe(true);

      const result = isUserExempted('visionshare', 'user-123');
      expect(result.exempted).toBe(false);
    });

    it('should return false when removing non-existent rule', () => {
      const removed = removeExemptionRule('visionshare', 'nonexistent-rule');
      expect(removed).toBe(false);
    });

    it('should check exemption with credit score below threshold', () => {
      addExemptionRule('visionshare', {
        name: 'VIP',
        type: 'user',
        targetIds: ['user-123'],
      });

      const result = checkSceneCreditThreshold('visionshare', 100, 'user-123');

      expect(result.meetsThreshold).toBe(true);
      expect(result.exempted).toBe(true);
      expect(result.exemptionRule?.name).toBe('VIP');
    });

    it('should check agent exemption', () => {
      addExemptionRule('visionshare', {
        name: 'Trusted Agent',
        type: 'agent',
        targetIds: ['agent-123'],
      });

      const result = checkSceneCreditThreshold('visionshare', 100, 'user-456', 'agent-123');

      expect(result.meetsThreshold).toBe(true);
      expect(result.exempted).toBe(true);
    });

    it('should support manual exemption type', () => {
      const rule = addExemptionRule('visionshare', {
        name: 'Manual Override',
        type: 'manual',
        targetIds: ['user-manual'],
        creditScoreOverride: 300,
        grantedBy: 'admin-1',
      });

      expect(rule?.type).toBe('manual');
      expect(rule?.creditScoreOverride).toBe(300);
      expect(rule?.grantedBy).toBe('admin-1');
    });
  });

  // ===== 门槛变更通知 (Threshold Change Notifications) =====
  describe('门槛变更通知 (Threshold Change Notifications)', () => {
    it('should send notification on threshold increase', () => {
      const notification = getThresholdChangeNotification('visionshare', 500, 700);

      expect(notification.title).toContain('提高');
      expect(notification.message).toContain('500');
      expect(notification.message).toContain('700');
    });

    it('should send notification on threshold decrease', () => {
      const notification = getThresholdChangeNotification('visionshare', 700, 400);

      expect(notification.title).toContain('降低');
      expect(notification.message).toContain('700');
      expect(notification.message).toContain('400');
    });

    it('should include scene name in notification', () => {
      const notification = getThresholdChangeNotification('agentdate', 600, 700);

      expect(notification.title).toContain('Agent约会');
      expect(notification.message).toContain('Agent约会');
    });

    it('should use sceneId when scene not found', () => {
      const notification = getThresholdChangeNotification('custom-scene', 500, 600);

      expect(notification.title).toContain('custom-scene');
    });

    it('should generate insufficient credit notification', () => {
      const notification = getInsufficientCreditNotification('visionshare', 400, 600);

      expect(notification.title).toContain('信用分不足');
      expect(notification.message).toContain('400');
      expect(notification.message).toContain('600');
      expect(notification.message).toContain('200'); // gap
    });

    it('should handle null score in insufficient notification', () => {
      const notification = getInsufficientCreditNotification('visionshare', null, 600);

      expect(notification.title).toContain('信用分不足');
      expect(notification.message).toContain('无');
      expect(notification.message).toContain('600');
    });

    it('should send insufficient credit notification for scene', () => {
      const notification = getInsufficientCreditNotification('agentdate', 500, 600);

      expect(notification.title).toContain('Agent约会');
      expect(notification.message).toContain('500');
    });
  });

  // ===== Cross-Module Integration =====
  describe('Cross-Module Integration (C005~c1 + C005~c2)', () => {
    it('should filter by credit and enforce scene threshold together', () => {
      const threshold = getSceneThreshold('visionshare');
      const options: CreditFilterOptions = { minCreditScore: threshold!.minCreditScore };
      const condition = buildCreditFilterCondition(options);

      expect(condition.user.creditScore.score.gte).toBe(500);
    });

    it('should exempt user from scene threshold filtering', () => {
      addExemptionRule('visionshare', {
        name: 'VIP',
        type: 'user',
        targetIds: ['user-exempt'],
      });

      const exemption = isUserExempted('visionshare', 'user-exempt');
      const thresholdResult = checkSceneCreditThreshold('visionshare', 100, 'user-exempt');

      expect(exemption.exempted).toBe(true);
      expect(thresholdResult.meetsThreshold).toBe(true);
      expect(thresholdResult.exempted).toBe(true);
    });

    it('should allow level-based filtering across different scenes', () => {
      const visionshare = getSceneThreshold('visionshare');
      const agentdate = getSceneThreshold('agentdate');

      // visionshare requires 'average' level (min 500)
      expect(CREDIT_LEVEL_THRESHOLDS['average'].min).toBeLessThanOrEqual(visionshare!.minCreditScore);

      // agentdate requires 'good' level (min 600)
      expect(CREDIT_LEVEL_THRESHOLDS['good'].min).toBeLessThanOrEqual(agentdate!.minCreditScore);
    });

    it('should handle no-credit users with scene exemptions', () => {
      addExemptionRule('visionshare', {
        name: 'New User Promotion',
        type: 'promotion',
      });

      const result = checkSceneCreditThreshold('visionshare', null, 'any-user');
      expect(result.meetsThreshold).toBe(true);
      expect(result.exempted).toBe(true);
    });

    it('should update threshold and reflect in filter', () => {
      updateSceneThreshold('visionshare', { minCreditScore: 800 });

      const threshold = getSceneThreshold('visionshare');
      const options: CreditFilterOptions = { minCreditScore: threshold!.minCreditScore };
      const condition = buildCreditFilterCondition(options);

      expect(condition.user.creditScore.score.gte).toBe(800);
    });
  });
});
