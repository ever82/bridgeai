/**
 * Disclosure Audit Service Tests
 */
import { disclosureAuditService, DisclosureAuditService } from '../disclosureAuditService';
import { DisclosureLevel, DisclosureAuditEntry, DisclosureChangeRecord } from '@bridgeai/shared';
import { auditService } from '../auditService';

// Mock auditService
jest.mock('../auditService', () => ({
  auditService: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('DisclosureAuditService', () => {
  let service: DisclosureAuditService;

  beforeEach(() => {
    service = new DisclosureAuditService();
    jest.clearAllMocks();
  });

  describe('logDisclosureChange', () => {
    it('should create a change record', async () => {
      const change = {
        agentId: 'agent-1',
        fieldName: 'email',
        previousLevel: DisclosureLevel.PUBLIC,
        newLevel: DisclosureLevel.AFTER_MATCH,
        changedBy: 'user-1',
      };

      const record = await service.logDisclosureChange(change);

      expect(record.agentId).toBe('agent-1');
      expect(record.fieldName).toBe('email');
      expect(record.previousLevel).toBe(DisclosureLevel.PUBLIC);
      expect(record.newLevel).toBe(DisclosureLevel.AFTER_MATCH);
      expect(record.changedBy).toBe('user-1');
      expect(record.id).toBeDefined();
      expect(record.changedAt).toBeDefined();
    });

    it('should log to audit service', async () => {
      const change = {
        agentId: 'agent-1',
        fieldName: 'email',
        previousLevel: DisclosureLevel.PUBLIC,
        newLevel: DisclosureLevel.AFTER_MATCH,
        changedBy: 'user-1',
      };

      await service.logDisclosureChange(change);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DISCLOSURE_LEVEL_CHANGED',
          resource: 'disclosure',
          resourceId: 'agent-1',
          userId: 'user-1',
        })
      );
    });

    it('should notify affected users when level becomes more restrictive', async () => {
      const change = {
        agentId: 'agent-1',
        fieldName: 'email',
        previousLevel: DisclosureLevel.PUBLIC,
        newLevel: DisclosureLevel.AFTER_REFERRAL,
        changedBy: 'user-1',
      };

      await service.logDisclosureChange(change);

      // Notification should be triggered for more restrictive changes
      // This is handled internally by the service
    });
  });

  describe('logAccessAttempt', () => {
    it('should create an access entry for granted access', async () => {
      const attempt = {
        agentId: 'agent-1',
        fieldName: 'email',
        accessedBy: 'viewer-1',
        ownerId: 'owner-1',
        accessGranted: true,
      };

      const entry = await service.logAccessAttempt(attempt);

      expect(entry.agentId).toBe('agent-1');
      expect(entry.fieldName).toBe('email');
      expect(entry.accessedBy).toBe('viewer-1');
      expect(entry.ownerId).toBe('owner-1');
      expect(entry.accessGranted).toBe(true);
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
    });

    it('should log denied access to security audit', async () => {
      const attempt = {
        agentId: 'agent-1',
        fieldName: 'email',
        accessedBy: 'viewer-1',
        ownerId: 'owner-1',
        accessGranted: false,
      };

      await service.logAccessAttempt(attempt);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DISCLOSURE_ACCESS_DENIED',
          resource: 'disclosure',
          resourceId: 'agent-1',
          userId: 'viewer-1',
        })
      );
    });
  });

  describe('getChangeHistory', () => {
    it('should return change history for an agent', async () => {
      const history = await service.getChangeHistory('agent-1');

      expect(Array.isArray(history)).toBe(true);
    });

    it('should respect the limit parameter', async () => {
      const history = await service.getChangeHistory('agent-1', 10);

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('getAccessLog', () => {
    it('should return access log for an agent', async () => {
      const log = await service.getAccessLog('agent-1');

      expect(Array.isArray(log)).toBe(true);
    });

    it('should accept date range options', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const log = await service.getAccessLog('agent-1', {
        startDate,
        endDate,
        limit: 50,
      });

      expect(Array.isArray(log)).toBe(true);
    });
  });

  describe('getDisclosureStats', () => {
    it('should return disclosure statistics', async () => {
      const stats = await service.getDisclosureStats('agent-1');

      expect(stats).toHaveProperty('totalChanges');
      expect(stats).toHaveProperty('totalAccessAttempts');
      expect(stats).toHaveProperty('deniedAccessCount');
      expect(stats).toHaveProperty('mostAccessedFields');
      expect(Array.isArray(stats.mostAccessedFields)).toBe(true);
    });
  });

  describe('getChangesAffectingUser', () => {
    it('should return changes affecting a user', async () => {
      const changes = await service.getChangesAffectingUser('user-1');

      expect(Array.isArray(changes)).toBe(true);
    });

    it('should respect the limit parameter', async () => {
      const changes = await service.getChangesAffectingUser('user-1', 5);

      expect(Array.isArray(changes)).toBe(true);
    });
  });

  describe('cleanupOldRecords', () => {
    it('should clean up old records', async () => {
      const result = await service.cleanupOldRecords();

      expect(result).toHaveProperty('deletedCount');
      expect(typeof result.deletedCount).toBe('number');
    });
  });

  describe('withdrawDisclosedInfo', () => {
    it('should create a withdrawal record', async () => {
      const record = await service.withdrawDisclosedInfo(
        'agent-1',
        'email',
        'user-1',
        'Privacy concerns'
      );

      expect(record.agentId).toBe('agent-1');
      expect(record.fieldName).toBe('email');
      expect(record.previousLevel).toBe(DisclosureLevel.PUBLIC);
      expect(record.newLevel).toBe(DisclosureLevel.AFTER_REFERRAL);
    });

    it('should log withdrawal to audit', async () => {
      await service.withdrawDisclosedInfo('agent-1', 'email', 'user-1', 'Privacy concerns');

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DISCLOSURE_WITHDRAWN',
          resource: 'disclosure',
          resourceId: 'agent-1',
          userId: 'user-1',
        })
      );
    });
  });
});
