/**
 * Scene Configuration Tests
 * 场景配置测试
 */

import {
  visionShareConfig,
  agentDateConfig,
  agentJobConfig,
  agentAdConfig,
  getSceneConfig,
  getAllSceneConfigs,
  getActiveSceneConfigs,
  getSceneInfo,
  getAllSceneInfos,
  hasScene,
} from './index';
import { SCENE_IDS, SceneConfig } from '../../types/scene';

describe('Scene Configurations', () => {
  describe('Scene Config Exports', () => {
    it('should export all four scene configs', () => {
      expect(visionShareConfig).toBeDefined();
      expect(agentDateConfig).toBeDefined();
      expect(agentJobConfig).toBeDefined();
      expect(agentAdConfig).toBeDefined();
    });

    it('should have correct scene IDs', () => {
      expect(visionShareConfig.id).toBe('visionshare');
      expect(agentDateConfig.id).toBe('agentdate');
      expect(agentJobConfig.id).toBe('agentjob');
      expect(agentAdConfig.id).toBe('agentad');
    });
  });

  describe('VisionShare Config', () => {
    it('should have valid metadata', () => {
      expect(visionShareConfig.metadata).toMatchObject({
        id: 'visionshare',
        name: '视觉分享',
        nameEn: 'VisionShare',
        isActive: true,
      });
      expect(visionShareConfig.metadata.icon).toBeDefined();
      expect(visionShareConfig.metadata.color).toBeDefined();
    });

    it('should have fields defined', () => {
      expect(visionShareConfig.fields.length).toBeGreaterThan(0);
      expect(visionShareConfig.fields.every(f => f.id && f.name && f.type)).toBe(true);
    });

    it('should have capabilities defined', () => {
      expect(visionShareConfig.capabilities.length).toBeGreaterThan(0);
    });

    it('should have templates defined', () => {
      expect(visionShareConfig.templates.length).toBeGreaterThan(0);
    });

    it('should have UI config', () => {
      expect(visionShareConfig.ui.sections.length).toBeGreaterThan(0);
      expect(visionShareConfig.ui.layout).toBeDefined();
    });
  });

  describe('AgentDate Config', () => {
    it('should have valid metadata', () => {
      expect(agentDateConfig.metadata).toMatchObject({
        id: 'agentdate',
        name: 'Agent约会',
        nameEn: 'AgentDate',
        isActive: true,
      });
    });

    it('should have dating-specific fields', () => {
      const fieldNames = agentDateConfig.fields.map(f => f.name);
      expect(fieldNames).toContain('datingPurpose');
      expect(fieldNames).toContain('preferredGender');
      expect(fieldNames).toContain('ageRange');
      expect(fieldNames).toContain('aboutMe');
    });
  });

  describe('AgentJob Config', () => {
    it('should have valid metadata', () => {
      expect(agentJobConfig.metadata).toMatchObject({
        id: 'agentjob',
        name: 'Agent求职',
        nameEn: 'AgentJob',
        isActive: true,
      });
    });

    it('should have job-specific fields', () => {
      const fieldNames = agentJobConfig.fields.map(f => f.name);
      expect(fieldNames).toContain('jobType');
      expect(fieldNames).toContain('jobCategory');
      expect(fieldNames).toContain('targetPositions');
      expect(fieldNames).toContain('skills');
    });
  });

  describe('AgentAd Config', () => {
    it('should have valid metadata', () => {
      expect(agentAdConfig.metadata).toMatchObject({
        id: 'agentad',
        name: 'Agent广告',
        nameEn: 'AgentAd',
        isActive: true,
      });
    });

    it('should have ad-specific fields', () => {
      const fieldNames = agentAdConfig.fields.map(f => f.name);
      expect(fieldNames).toContain('adType');
      expect(fieldNames).toContain('productCategory');
      expect(fieldNames).toContain('targetAudience');
      expect(fieldNames).toContain('campaignObjective');
    });
  });

  describe('getSceneConfig', () => {
    it('should return config for valid scene', () => {
      expect(getSceneConfig('visionshare')).toBeDefined();
      expect(getSceneConfig('agentdate')).toBeDefined();
      expect(getSceneConfig('agentjob')).toBeDefined();
      expect(getSceneConfig('agentad')).toBeDefined();
    });

    it('should return undefined for invalid scene', () => {
      expect(getSceneConfig('invalid' as any)).toBeUndefined();
    });
  });

  describe('getAllSceneConfigs', () => {
    it('should return all scene configs', () => {
      const configs = getAllSceneConfigs();
      expect(configs).toHaveLength(4);
      expect(configs.some(c => c.id === 'visionshare')).toBe(true);
      expect(configs.some(c => c.id === 'agentdate')).toBe(true);
      expect(configs.some(c => c.id === 'agentjob')).toBe(true);
      expect(configs.some(c => c.id === 'agentad')).toBe(true);
    });
  });

  describe('getActiveSceneConfigs', () => {
    it('should return only active scenes', () => {
      const configs = getActiveSceneConfigs();
      expect(configs.every(c => c.metadata.isActive)).toBe(true);
    });
  });

  describe('getSceneInfo', () => {
    it('should return scene info for valid scene', () => {
      const info = getSceneInfo('visionshare');
      expect(info).toBeDefined();
      expect(info?.id).toBe('visionshare');
      expect(info?.name).toBeDefined();
      expect(info?.fieldCount).toBeGreaterThan(0);
      expect(info?.capabilityCount).toBeGreaterThan(0);
    });

    it('should return null for invalid scene', () => {
      expect(getSceneInfo('invalid' as any)).toBeNull();
    });
  });

  describe('getAllSceneInfos', () => {
    it('should return info for all scenes', () => {
      const infos = getAllSceneInfos();
      expect(infos).toHaveLength(4);
    });
  });

  describe('hasScene', () => {
    it('should return true for valid scenes', () => {
      expect(hasScene('visionshare')).toBe(true);
      expect(hasScene('agentdate')).toBe(true);
      expect(hasScene('agentjob')).toBe(true);
      expect(hasScene('agentad')).toBe(true);
    });

    it('should return false for invalid scene', () => {
      expect(hasScene('invalid' as any)).toBe(false);
    });
  });
});
