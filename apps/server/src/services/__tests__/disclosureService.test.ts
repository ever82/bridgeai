/**
 * Disclosure Service Tests
 */
import {
  DisclosureLevel,
  RelationshipStage,
  createDefaultDisclosureSettings,
} from '@bridgeai/shared';

import { DisclosureService } from '../disclosureService';
import { disclosureAuditService } from '../disclosureAuditService';
import { prisma } from '../../db/client';

// Mock dependencies
jest.mock('../../db/client', () => ({
  prisma: {
    agent: {
      findUnique: jest.fn(),
    },
    match: {
      findFirst: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    message: {
      count: jest.fn().mockResolvedValue(0),
    },
    disclosureSettings: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    disclosureChange: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    disclosureAccessLog: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
  },
}));
jest.mock('../disclosureAuditService');
jest.mock('../auditService', () => ({
  auditService: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('DisclosureService', () => {
  let service: DisclosureService;

  beforeEach(() => {
    service = new DisclosureService();
    jest.clearAllMocks();
  });

  describe('getDisclosureSettings', () => {
    it('should create default settings if none exist', async () => {
      const mockAgent = { id: 'agent-1', userId: 'user-1' };
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);

      const settings = await service.getDisclosureSettings('agent-1');

      expect(settings.agentId).toBe('agent-1');
      expect(settings.userId).toBe('user-1');
      expect(settings.fieldDisclosures).toBeDefined();
      expect(settings.defaultLevel).toBe(DisclosureLevel.AFTER_MATCH);
    });

    it('should throw error if agent not found', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getDisclosureSettings('non-existent')).rejects.toThrow(
        'Agent not found'
      );
    });
  });

  describe('canViewField', () => {
    beforeEach(() => {
      const mockAgent = { id: 'agent-1', userId: 'owner-1' };
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
    });

    it('should allow owner to view their own fields', async () => {
      const result = await service.canViewField('agent-1', 'name', 'owner-1');

      expect(result.canView).toBe(true);
      expect(result.relationshipStage).toBe(RelationshipStage.REFERRED);
    });

    it('should deny access to non-disclosable fields', async () => {
      // Mock settings with non-disclosable field
      const mockSettings = createDefaultDisclosureSettings('agent-1', 'owner-1');
      mockSettings.fieldDisclosures = [
        {
          fieldName: 'secret',
          level: DisclosureLevel.PUBLIC,
          isDisclosable: false,
          defaultLevel: DisclosureLevel.PUBLIC,
        },
      ];

      // @ts-expect-error - accessing private method for testing
      jest.spyOn(service, 'loadSettingsFromDB').mockResolvedValue(mockSettings);

      const result = await service.canViewField('agent-1', 'secret', 'viewer-1');

      expect(result.canView).toBe(false);
      expect(result.denialReason).toBe('Field is not disclosable');
    });

    it('should deny access in strict mode for unconfigured fields', async () => {
      const mockSettings = createDefaultDisclosureSettings('agent-1', 'owner-1');
      mockSettings.strictMode = true;
      mockSettings.fieldDisclosures = [];

      // @ts-expect-error - accessing private method for testing
      jest.spyOn(service, 'loadSettingsFromDB').mockResolvedValue(mockSettings);

      const result = await service.canViewField('agent-1', 'unknown', 'viewer-1');

      expect(result.canView).toBe(false);
      expect(result.denialReason).toBe('Field not configured in strict mode');
    });
  });

  describe('getRelationshipStage', () => {
    it('should return REFERRED for same user', async () => {
      const stage = await service.getRelationshipStage('user-1', 'user-1');
      expect(stage).toBe(RelationshipStage.REFERRED);
    });

    it('should return NONE if no relationship exists', async () => {
      (prisma.match.findFirst as jest.Mock).mockResolvedValue(null);

      const stage = await service.getRelationshipStage('user-1', 'user-2');
      expect(stage).toBe(RelationshipStage.NONE);
    });

    it('should return MATCHED if users have matched', async () => {
      (prisma.match.findFirst as jest.Mock).mockResolvedValue({ id: 'match-1' });
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      const stage = await service.getRelationshipStage('user-1', 'user-2');
      expect(stage).toBe(RelationshipStage.MATCHED);
    });

    it('should return CHATTED if users have chatted', async () => {
      (prisma.match.findFirst as jest.Mock).mockResolvedValue({ id: 'match-1' });
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue({ id: 'conv-1' });
      (prisma.message.count as jest.Mock).mockResolvedValue(2);

      const stage = await service.getRelationshipStage('user-1', 'user-2');
      expect(stage).toBe(RelationshipStage.CHATTED);
    });
  });

  describe('filterAgentData', () => {
    beforeEach(() => {
      const mockAgent = { id: 'agent-1', userId: 'owner-1' };
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
    });

    it('should filter out fields viewer cannot see', async () => {
      const agentData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
      };

      // Owner should see everything
      const filtered = await service.filterAgentData('agent-1', agentData, 'owner-1');
      expect(filtered).toEqual(agentData);
    });
  });

  describe('bulkUpdateDisclosure', () => {
    beforeEach(() => {
      const mockAgent = { id: 'agent-1', userId: 'owner-1' };
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
    });

    it('should update multiple fields', async () => {
      const updates = [
        { fieldName: 'name', level: DisclosureLevel.AFTER_MATCH },
        { fieldName: 'email', level: DisclosureLevel.AFTER_CHAT },
      ];

      const settings = await service.bulkUpdateDisclosure('agent-1', updates, 'owner-1');

      const nameField = settings.fieldDisclosures.find(
        (f: { fieldName: string }) => f.fieldName === 'name'
      );
      const emailField = settings.fieldDisclosures.find(
        (f: { fieldName: string }) => f.fieldName === 'email'
      );

      expect(nameField?.level).toBe(DisclosureLevel.AFTER_MATCH);
      expect(emailField?.level).toBe(DisclosureLevel.AFTER_CHAT);
    });

    it('should log changes for audit', async () => {
      const updates = [{ fieldName: 'name', level: DisclosureLevel.AFTER_MATCH }];

      await service.bulkUpdateDisclosure('agent-1', updates, 'owner-1');

      expect(disclosureAuditService.logDisclosureChange).toHaveBeenCalled();
    });
  });

  describe('resetToDefaults', () => {
    beforeEach(() => {
      const mockAgent = { id: 'agent-1', userId: 'owner-1' };
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
    });

    it('should reset settings to defaults', async () => {
      const settings = await service.resetToDefaults('agent-1', 'owner-1');

      expect(settings.agentId).toBe('agent-1');
      expect(settings.userId).toBe('owner-1');
      expect(settings.defaultLevel).toBe(DisclosureLevel.AFTER_MATCH);
    });

    it('should throw error if agent not found', async () => {
      (prisma.agent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.resetToDefaults('non-existent', 'owner-1')).rejects.toThrow(
        'Agent not found'
      );
    });
  });
});
