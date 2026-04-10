/**
 * @jest-environment node
 */

/**
 * Scene Migration Service Tests
 * 场景迁移服务测试
 */

import {
  generateMigrationPlan,
  previewMigration,
  executeMigration,
  validateMigration,
  estimateDataLoss,
} from '../sceneMigrationService';
import { prisma } from '../../db/client';

// Mock prisma
jest.mock('../../db/client', () => ({
  prisma: {
    agentProfile: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    agent: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('SceneMigrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMigrationPlan', () => {
    it('should generate migration plan between scenes', () => {
      const plan = generateMigrationPlan('visionshare', 'agentdate');

      expect(plan).toBeDefined();
      expect(plan.fromScene).toBe('visionshare');
      expect(plan.toScene).toBe('agentdate');
      expect(plan.fieldMappings).toBeDefined();
      expect(plan.transformations).toBeDefined();
      expect(plan.warnings).toBeDefined();
    });

    it('should throw error for invalid source scene', () => {
      expect(() => generateMigrationPlan('invalid' as any, 'agentdate')).toThrow('Invalid scene IDs');
    });

    it('should throw error for invalid target scene', () => {
      expect(() => generateMigrationPlan('visionshare', 'invalid' as any)).toThrow('Invalid scene IDs');
    });
  });

  describe('previewMigration', () => {
    it('should preview migration', async () => {
      const mockProfile = {
        id: 'profile-1',
        agentId: 'agent-1',
        sceneId: 'visionshare',
        l2Data: {
          contentType: ['photography'],
          purpose: 'share',
        },
      };

      (prisma.agentProfile.findFirst as jest.Mock).mockResolvedValue(mockProfile);

      const preview = await previewMigration('agent-1', 'visionshare', 'agentdate');

      expect(preview).toBeDefined();
      expect(preview.migration).toBeDefined();
      expect(preview.currentData).toBeDefined();
      expect(preview.previewData).toBeDefined();
      expect(preview.willLoseData).toBeDefined();
      expect(preview.needsManualInput).toBeDefined();
    });

    it('should throw error when profile not found', async () => {
      (prisma.agentProfile.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(previewMigration('agent-1', 'visionshare', 'agentdate')).rejects.toThrow('Agent profile not found');
    });
  });

  describe('executeMigration', () => {
    it('should execute migration successfully', async () => {
      const mockProfile = {
        id: 'profile-1',
        agentId: 'agent-1',
        sceneId: 'visionshare',
        l2Data: {
          contentType: ['photography'],
        },
      };

      const mockAgent = {
        id: 'agent-1',
        userId: 'user-1',
      };

      const mockNewProfile = {
        id: 'profile-2',
        agentId: 'agent-1',
        sceneId: 'agentdate',
        l2Data: {},
      };

      (prisma.agentProfile.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce(null);
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
      (prisma.agentProfile.create as jest.Mock).mockResolvedValue(mockNewProfile);

      const result = await executeMigration('agent-1', 'visionshare', 'agentdate');

      expect(result.success).toBe(true);
      expect(result.newProfileId).toBeDefined();
      expect(result.migratedFields).toBeDefined();
      expect(result.lostFields).toBeDefined();
    });

    it('should update existing profile if exists', async () => {
      const mockProfile = {
        id: 'profile-1',
        agentId: 'agent-1',
        sceneId: 'visionshare',
        l2Data: {},
      };

      const mockExistingProfile = {
        id: 'profile-2',
        agentId: 'agent-1',
        sceneId: 'agentdate',
        l2Data: {},
      };

      const mockAgent = {
        id: 'agent-1',
        userId: 'user-1',
      };

      (prisma.agentProfile.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce(mockExistingProfile);
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
      (prisma.agentProfile.update as jest.Mock).mockResolvedValue(mockExistingProfile);

      const result = await executeMigration('agent-1', 'visionshare', 'agentdate');

      expect(result.success).toBe(true);
      expect(prisma.agentProfile.update).toHaveBeenCalled();
    });

    it('should throw error when agent not found', async () => {
      const mockProfile = {
        id: 'profile-1',
        agentId: 'agent-1',
        sceneId: 'visionshare',
        l2Data: {},
      };

      (prisma.agentProfile.findFirst as jest.Mock).mockResolvedValue(mockProfile);
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(executeMigration('agent-1', 'visionshare', 'agentdate')).rejects.toThrow('Agent not found');
    });
  });

  describe('validateMigration', () => {
    it('should validate valid migration', () => {
      const result = validateMigration('visionshare', 'agentdate');

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should invalidate same scene migration', () => {
      const result = validateMigration('visionshare', 'visionshare');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('same');
    });

    it('should invalidate invalid source scene', () => {
      const result = validateMigration('invalid' as any, 'agentdate');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('source');
    });

    it('should invalidate invalid target scene', () => {
      const result = validateMigration('visionshare', 'invalid' as any);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('target');
    });
  });

  describe('estimateDataLoss', () => {
    it('should estimate data loss between scenes', () => {
      const estimate = estimateDataLoss('visionshare', 'agentdate');

      expect(estimate).toBeDefined();
      expect(estimate.willLoseData).toBeDefined();
      expect(estimate.lossPercentage).toBeDefined();
      expect(estimate.lostFields).toBeDefined();
      expect(typeof estimate.willLoseData).toBe('boolean');
      expect(typeof estimate.lossPercentage).toBe('number');
      expect(Array.isArray(estimate.lostFields)).toBe(true);
    });

    it('should return zero loss for same scene', () => {
      const estimate = estimateDataLoss('visionshare', 'visionshare');

      expect(estimate.lossPercentage).toBe(0);
      expect(estimate.lostFields).toHaveLength(0);
    });

    it('should handle invalid scenes gracefully', () => {
      const estimate = estimateDataLoss('invalid' as any, 'agentdate');

      expect(estimate.willLoseData).toBe(false);
      expect(estimate.lossPercentage).toBe(0);
    });
  });
});
