/**
 * Credit Thresholds Configuration Tests
 * 信用门槛配置测试
 */

import {
  DEFAULT_SCENE_THRESHOLDS,
  getSceneThreshold,
  getAllSceneThresholds,
  updateSceneThreshold,
  addExemptionRule,
  removeExemptionRule,
  isUserExempted,
  checkSceneCreditThreshold,
  getThresholdChangeNotification,
  getInsufficientCreditNotification,
  ExemptionRule,
  resetSceneThresholds,
} from '../creditThresholds';

describe('CreditThresholds', () => {
  beforeEach(() => {
    // Reset to default thresholds before each test
    resetSceneThresholds();
  });

  describe('DEFAULT_SCENE_THRESHOLDS', () => {
    it('should have default thresholds for all scenes', () => {
      expect(DEFAULT_SCENE_THRESHOLDS.visionshare).toBeDefined();
      expect(DEFAULT_SCENE_THRESHOLDS.agentdate).toBeDefined();
      expect(DEFAULT_SCENE_THRESHOLDS.agentjob).toBeDefined();
      expect(DEFAULT_SCENE_THRESHOLDS.agentad).toBeDefined();
    });

    it('should have correct visionshare threshold', () => {
      const threshold = DEFAULT_SCENE_THRESHOLDS.visionshare;
      expect(threshold.sceneId).toBe('visionshare');
      expect(threshold.sceneName).toBe('视觉分享');
      expect(threshold.minCreditScore).toBe(500);
      expect(threshold.minCreditLevel).toBe('average');
      expect(threshold.isActive).toBe(true);
    });

    it('should have correct agentdate threshold', () => {
      const threshold = DEFAULT_SCENE_THRESHOLDS.agentdate;
      expect(threshold.sceneId).toBe('agentdate');
      expect(threshold.sceneName).toBe('Agent约会');
      expect(threshold.minCreditScore).toBe(600);
      expect(threshold.minCreditLevel).toBe('good');
      expect(threshold.isActive).toBe(true);
    });

    it('should have correct agentjob threshold', () => {
      const threshold = DEFAULT_SCENE_THRESHOLDS.agentjob;
      expect(threshold.sceneId).toBe('agentjob');
      expect(threshold.sceneName).toBe('Agent求职');
      expect(threshold.minCreditScore).toBe(400);
      expect(threshold.minCreditLevel).toBe('average');
      expect(threshold.isActive).toBe(true);
    });

    it('should have correct agentad threshold', () => {
      const threshold = DEFAULT_SCENE_THRESHOLDS.agentad;
      expect(threshold.sceneId).toBe('agentad');
      expect(threshold.sceneName).toBe('Agent广告');
      expect(threshold.minCreditScore).toBe(500);
      expect(threshold.minCreditLevel).toBe('average');
      expect(threshold.isActive).toBe(true);
    });

    it('should have notification config for each scene', () => {
      Object.values(DEFAULT_SCENE_THRESHOLDS).forEach(threshold => {
        expect(threshold.notifications).toBeDefined();
        expect(threshold.notifications.enabled).toBe(true);
        expect(Array.isArray(threshold.notifications.channels)).toBe(true);
        expect(threshold.exemptions).toBeDefined();
        expect(Array.isArray(threshold.exemptions)).toBe(true);
      });
    });
  });

  describe('getSceneThreshold', () => {
    it('should return threshold for existing scene', () => {
      const threshold = getSceneThreshold('visionshare');
      expect(threshold).toBeDefined();
      expect(threshold?.sceneId).toBe('visionshare');
    });

    it('should return undefined for non-existing scene', () => {
      const threshold = getSceneThreshold('nonexistent');
      expect(threshold).toBeUndefined();
    });
  });

  describe('getAllSceneThresholds', () => {
    it('should return all scene thresholds', () => {
      const thresholds = getAllSceneThresholds();
      expect(thresholds).toHaveLength(4);
      expect(thresholds.map(t => t.sceneId)).toContain('visionshare');
      expect(thresholds.map(t => t.sceneId)).toContain('agentdate');
      expect(thresholds.map(t => t.sceneId)).toContain('agentjob');
      expect(thresholds.map(t => t.sceneId)).toContain('agentad');
    });
  });

  describe('updateSceneThreshold', () => {
    it('should update threshold for existing scene', () => {
      const updates = {
        minCreditScore: 700,
        description: 'Updated description',
      };

      const updated = updateSceneThreshold('visionshare', updates);

      expect(updated).toBeDefined();
      expect(updated?.minCreditScore).toBe(700);
      expect(updated?.description).toBe('Updated description');
      expect(updated?.sceneId).toBe('visionshare');
      expect(updated?.sceneName).toBe('视觉分享'); // Unchanged
    });

    it('should return undefined for non-existing scene', () => {
      const updated = updateSceneThreshold('nonexistent', { minCreditScore: 700 });
      expect(updated).toBeUndefined();
    });

    it('should preserve existing exemptions when not provided', () => {
      // First add an exemption
      addExemptionRule('visionshare', {
        name: 'Test Exemption',
        type: 'user',
        targetIds: ['user-123'],
      });

      // Then update without exemptions
      const updated = updateSceneThreshold('visionshare', { minCreditScore: 700 });

      expect(updated?.exemptions.length).toBeGreaterThan(0);
    });
  });

  describe('addExemptionRule', () => {
    it('should add exemption rule to scene', () => {
      const rule = addExemptionRule('visionshare', {
        name: 'VIP User',
        type: 'user',
        targetIds: ['user-123'],
        creditScoreOverride: 400,
        reason: 'VIP customer',
      });

      expect(rule).toBeDefined();
      expect(rule?.name).toBe('VIP User');
      expect(rule?.type).toBe('user');
      expect(rule?.targetIds).toEqual(['user-123']);
      expect(rule?.creditScoreOverride).toBe(400);
      expect(rule?.id).toBeDefined();
    });

    it('should return null for non-existing scene', () => {
      const rule = addExemptionRule('nonexistent', {
        name: 'Test',
        type: 'user',
      });
      expect(rule).toBeNull();
    });

    it('should generate unique id for exemption', () => {
      const rule1 = addExemptionRule('visionshare', {
        name: 'Rule 1',
        type: 'user',
      });

      const rule2 = addExemptionRule('visionshare', {
        name: 'Rule 2',
        type: 'user',
      });

      expect(rule1?.id).not.toBe(rule2?.id);
    });
  });

  describe('removeExemptionRule', () => {
    it('should remove exemption rule from scene', () => {
      // First add an exemption
      const rule = addExemptionRule('visionshare', {
        name: 'To Remove',
        type: 'user',
      });

      // Then remove it
      const removed = removeExemptionRule('visionshare', rule!.id);

      expect(removed).toBe(true);
    });

    it('should return false for non-existing scene', () => {
      const removed = removeExemptionRule('nonexistent', 'rule-123');
      expect(removed).toBe(false);
    });

    it('should return false for non-existing rule', () => {
      const removed = removeExemptionRule('visionshare', 'nonexistent-rule');
      expect(removed).toBe(false);
    });
  });

  describe('isUserExempted', () => {
    it('should return exempted=true for user exemption', () => {
      addExemptionRule('visionshare', {
        name: 'VIP User',
        type: 'user',
        targetIds: ['user-123'],
      });

      const result = isUserExempted('visionshare', 'user-123');

      expect(result.exempted).toBe(true);
      expect(result.rule).toBeDefined();
    });

    it('should return exempted=false for non-exempted user', () => {
      addExemptionRule('visionshare', {
        name: 'VIP User',
        type: 'user',
        targetIds: ['user-123'],
      });

      const result = isUserExempted('visionshare', 'user-456');

      expect(result.exempted).toBe(false);
      expect(result.rule).toBeUndefined();
    });

    it('should check agent exemption when agentId provided', () => {
      addExemptionRule('visionshare', {
        name: 'Agent Exemption',
        type: 'agent',
        targetIds: ['agent-123'],
      });

      const result = isUserExempted('visionshare', 'user-123', 'agent-123');

      expect(result.exempted).toBe(true);
    });

    it('should return exempted=true for promotion exemption', () => {
      addExemptionRule('visionshare', {
        name: 'New Year Promotion',
        type: 'promotion',
      });

      const result = isUserExempted('visionshare', 'any-user');

      expect(result.exempted).toBe(true);
    });

    it('should skip expired exemptions', () => {
      addExemptionRule('visionshare', {
        name: 'Expired Exemption',
        type: 'user',
        targetIds: ['user-123'],
        validUntil: new Date('2020-01-01'), // Expired
      });

      const result = isUserExempted('visionshare', 'user-123');

      expect(result.exempted).toBe(false);
    });

    it('should return exempted=false for non-existing scene', () => {
      const result = isUserExempted('nonexistent', 'user-123');
      expect(result.exempted).toBe(false);
    });
  });

  describe('checkSceneCreditThreshold', () => {
    it('should return meetsThreshold=true when credit score meets requirement', () => {
      const result = checkSceneCreditThreshold('visionshare', 600, 'user-123');

      expect(result.meetsThreshold).toBe(true);
      expect(result.requiredScore).toBe(500);
      expect(result.requiredLevel).toBe('average');
      expect(result.exempted).toBe(false);
    });

    it('should return meetsThreshold=false when credit score below requirement', () => {
      const result = checkSceneCreditThreshold('visionshare', 400, 'user-123');

      expect(result.meetsThreshold).toBe(false);
      expect(result.requiredScore).toBe(500);
      expect(result.exempted).toBe(false);
    });

    it('should return meetsThreshold=false when no credit score', () => {
      const result = checkSceneCreditThreshold('visionshare', null, 'user-123');

      expect(result.meetsThreshold).toBe(false);
    });

    it('should return meetsThreshold=true when user is exempted', () => {
      addExemptionRule('visionshare', {
        name: 'VIP User',
        type: 'user',
        targetIds: ['user-123'],
      });

      const result = checkSceneCreditThreshold('visionshare', 400, 'user-123');

      expect(result.meetsThreshold).toBe(true);
      expect(result.exempted).toBe(true);
      expect(result.exemptionRule).toBeDefined();
    });

    it('should return meetsThreshold=true for inactive threshold', () => {
      updateSceneThreshold('visionshare', { isActive: false });

      const result = checkSceneCreditThreshold('visionshare', 100, 'user-123');

      expect(result.meetsThreshold).toBe(true);
      expect(result.requiredScore).toBe(0);
    });

    it('should return meetsThreshold=true for non-existing scene', () => {
      const result = checkSceneCreditThreshold('nonexistent', 100, 'user-123');

      expect(result.meetsThreshold).toBe(true);
      expect(result.requiredScore).toBe(0);
    });
  });

  describe('getThresholdChangeNotification', () => {
    it('should return increase notification when threshold raised', () => {
      const notification = getThresholdChangeNotification('visionshare', 500, 600);

      expect(notification.title).toContain('提高');
      expect(notification.message).toContain('500');
      expect(notification.message).toContain('600');
    });

    it('should return decrease notification when threshold lowered', () => {
      const notification = getThresholdChangeNotification('visionshare', 600, 500);

      expect(notification.title).toContain('降低');
      expect(notification.message).toContain('600');
      expect(notification.message).toContain('500');
    });

    it('should use sceneId when scene not found', () => {
      const notification = getThresholdChangeNotification('nonexistent', 500, 600);

      expect(notification.title).toContain('nonexistent');
    });
  });

  describe('getInsufficientCreditNotification', () => {
    it('should return notification with score gap', () => {
      const notification = getInsufficientCreditNotification('visionshare', 400, 500);

      expect(notification.title).toContain('信用分不足');
      expect(notification.message).toContain('400');
      expect(notification.message).toContain('500');
      expect(notification.message).toContain('100');
    });

    it('should handle null current score', () => {
      const notification = getInsufficientCreditNotification('visionshare', null, 500);

      expect(notification.message).toContain('无');
      expect(notification.message).toContain('500');
    });

    it('should use sceneId when scene not found', () => {
      const notification = getInsufficientCreditNotification('nonexistent', 400, 500);

      expect(notification.title).toContain('nonexistent');
    });
  });
});
