/**
 * @jest-environment node
 */

/**
 * Template Service Tests
 * 模板服务测试
 */

import {
  createTemplate,
  getTemplate,
  getTemplatesByScene,
  getPresetTemplates,
  updateTemplate,
  deleteTemplate,
  applyTemplate,
  duplicateTemplate,
  setDefaultTemplate,
  getDefaultTemplate,
  shareTemplate,
  searchTemplates,
} from '../templateService';
import { prisma } from '../../db/client';

// Mock prisma
jest.mock('../../db/client', () => ({
  prisma: {
    sceneTemplate: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    agentProfile: {
      findFirst: jest.fn(),
      update: jest.fn(),
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

describe('TemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const mockTemplate = {
        id: 'template-1',
        userId: 'user-1',
        sceneId: 'visionshare',
        name: 'Test Template',
        description: 'Test Description',
        isPreset: false,
        isDefault: false,
        fieldValues: { test: 'value' },
        isPublic: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.sceneTemplate.create as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await createTemplate('user-1', 'visionshare', {
        id: 'template-1',
        name: 'Test Template',
        description: 'Test Description',
        isPreset: false,
        isDefault: false,
        fieldValues: { test: 'value' },
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Template');
      expect(prisma.sceneTemplate.create).toHaveBeenCalled();
    });

    it('should throw error for invalid scene', async () => {
      await expect(
        createTemplate('user-1', 'invalid' as any, {
          id: 'template-1',
          name: 'Test',
          description: '',
          isPreset: false,
          isDefault: false,
          fieldValues: {},
        })
      ).rejects.toThrow('Invalid scene ID');
    });
  });

  describe('getTemplate', () => {
    it('should return template by id', async () => {
      const mockTemplate = {
        id: 'template-1',
        userId: 'user-1',
        sceneId: 'visionshare',
        name: 'Test Template',
        description: 'Test Description',
        isPreset: false,
        isDefault: false,
        fieldValues: { test: 'value' },
        isPublic: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.sceneTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await getTemplate('template-1', 'user-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('template-1');
    });

    it('should return null for non-existent template', async () => {
      (prisma.sceneTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getTemplate('non-existent', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('getTemplatesByScene', () => {
    it('should return templates for a scene', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          userId: 'user-1',
          sceneId: 'visionshare',
          name: 'Template 1',
          description: '',
          isPreset: false,
          isDefault: false,
          fieldValues: {},
          isPublic: false,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.sceneTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (prisma.sceneTemplate.count as jest.Mock).mockResolvedValue(1);

      const result = await getTemplatesByScene('visionshare', { userId: 'user-1' });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getPresetTemplates', () => {
    it('should return preset templates for a scene', () => {
      const templates = getPresetTemplates('visionshare');

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.isPreset)).toBe(true);
    });

    it('should return empty array for invalid scene', () => {
      const templates = getPresetTemplates('invalid' as any);

      expect(templates).toEqual([]);
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const mockTemplate = {
        id: 'template-1',
        userId: 'user-1',
        sceneId: 'visionshare',
        name: 'Updated Template',
        description: 'Updated',
        isPreset: false,
        isDefault: false,
        fieldValues: {},
        isPublic: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.sceneTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
      (prisma.sceneTemplate.update as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await updateTemplate('template-1', 'user-1', {
        name: 'Updated Template',
        description: 'Updated',
      });

      expect(result).toBeDefined();
      expect(prisma.sceneTemplate.update).toHaveBeenCalled();
    });

    it('should return null for non-owned template', async () => {
      (prisma.sceneTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await updateTemplate('template-1', 'user-2', {
        name: 'Updated',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      (prisma.sceneTemplate.findFirst as jest.Mock).mockResolvedValue({ id: 'template-1' });
      (prisma.sceneTemplate.delete as jest.Mock).mockResolvedValue({});

      const result = await deleteTemplate('template-1', 'user-1');

      expect(result).toBe(true);
      expect(prisma.sceneTemplate.delete).toHaveBeenCalled();
    });

    it('should return false for non-owned template', async () => {
      (prisma.sceneTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await deleteTemplate('template-1', 'user-2');

      expect(result).toBe(false);
    });
  });

  describe('applyTemplate', () => {
    it('should apply template to agent profile', async () => {
      const mockTemplate = {
        id: 'template-1',
        sceneId: 'visionshare',
        fieldValues: { test: 'value' },
      };

      const mockProfile = {
        id: 'profile-1',
        agentId: 'agent-1',
        l2Data: {},
      };

      (prisma.sceneTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
      (prisma.agentProfile.findFirst as jest.Mock).mockResolvedValue(mockProfile);
      (prisma.agentProfile.update as jest.Mock).mockResolvedValue(mockProfile);
      (prisma.sceneTemplate.update as jest.Mock).mockResolvedValue({ ...mockTemplate, usageCount: 1 });

      const result = await applyTemplate('template-1', 'agent-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.appliedFields).toContain('test');
    });
  });

  describe('duplicateTemplate', () => {
    it('should duplicate a template', async () => {
      const mockTemplate = {
        id: 'template-1',
        userId: 'user-1',
        sceneId: 'visionshare',
        name: 'Original Template',
        description: 'Description',
        isPreset: false,
        isDefault: false,
        fieldValues: {},
        isPublic: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDuplicatedTemplate = {
        ...mockTemplate,
        id: 'template-2',
        name: 'Original Template (复制)',
      };

      (prisma.sceneTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
      (prisma.sceneTemplate.create as jest.Mock).mockResolvedValue(mockDuplicatedTemplate);

      const result = await duplicateTemplate('template-1', 'user-1');

      expect(result).toBeDefined();
      expect(result?.name).toContain('复制');
    });
  });

  describe('setDefaultTemplate', () => {
    it('should set default template', async () => {
      (prisma.sceneTemplate.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await setDefaultTemplate('template-1', 'user-1', 'visionshare');

      expect(result).toBe(true);
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return default template', async () => {
      const mockTemplate = {
        id: 'template-1',
        userId: 'user-1',
        sceneId: 'visionshare',
        name: 'Default Template',
        description: '',
        isPreset: false,
        isDefault: true,
        fieldValues: {},
        isPublic: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.sceneTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await getDefaultTemplate('visionshare', 'user-1');

      expect(result).toBeDefined();
      expect(result?.isDefault).toBe(true);
    });

    it('should return null when no default template', async () => {
      (prisma.sceneTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getDefaultTemplate('visionshare', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('shareTemplate', () => {
    it('should make template public', async () => {
      const mockTemplate = {
        id: 'template-1',
        userId: 'user-1',
        sceneId: 'visionshare',
        name: 'Shared Template',
        description: '',
        isPreset: false,
        isDefault: false,
        fieldValues: {},
        isPublic: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.sceneTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
      (prisma.sceneTemplate.update as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await shareTemplate('template-1', 'user-1');

      expect(result).toBeDefined();
      expect(result?.isPublic).toBe(true);
    });
  });

  describe('searchTemplates', () => {
    it('should search public templates', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          userId: 'user-1',
          sceneId: 'visionshare',
          name: 'Search Result',
          description: '',
          isPreset: false,
          isDefault: false,
          fieldValues: {},
          isPublic: true,
          usageCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.sceneTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (prisma.sceneTemplate.count as jest.Mock).mockResolvedValue(1);

      const result = await searchTemplates('search');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
