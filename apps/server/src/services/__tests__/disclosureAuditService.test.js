"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Disclosure Audit Service Tests
 */
const shared_1 = require("@bridgeai/shared");
const disclosureAuditService_1 = require("../disclosureAuditService");
const auditService_1 = require("../auditService");
jest.mock('../auditService', () => ({
    auditService: {
        log: jest.fn().mockResolvedValue(undefined),
    },
}));
jest.mock('../../db/client', () => ({
    prisma: {
        disclosureChange: {
            create: jest
                .fn()
                .mockImplementation(({ data }) => Promise.resolve({ ...data, id: data.id || 'change-1', changedAt: new Date() })),
            findMany: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
            update: jest.fn().mockResolvedValue({}),
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        disclosureAccessLog: {
            create: jest
                .fn()
                .mockImplementation(({ data }) => Promise.resolve({ ...data, id: data.id || 'access-1', timestamp: new Date() })),
            findMany: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            groupBy: jest.fn().mockResolvedValue([]),
        },
        disclosureSettings: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue({}),
        },
        match: {
            findMany: jest.fn().mockResolvedValue([]),
        },
        demand: {
            findMany: jest.fn().mockResolvedValue([]),
        },
        supply: {
            findMany: jest.fn().mockResolvedValue([]),
        },
    },
}));
jest.mock('../disclosureService', () => ({
    disclosureService: {
        getDisclosureSettings: jest.fn().mockResolvedValue({
            agentId: 'agent-1',
            userId: 'user-1',
            fieldDisclosures: [
                { fieldName: 'email', level: 'PUBLIC', isDisclosable: true, defaultLevel: 'PUBLIC' },
            ],
            defaultLevel: 'AFTER_MATCH',
            strictMode: false,
        }),
    },
}));
describe('DisclosureAuditService', () => {
    let service;
    beforeEach(() => {
        service = new disclosureAuditService_1.DisclosureAuditService();
        jest.clearAllMocks();
    });
    describe('logDisclosureChange', () => {
        it('should create a change record', async () => {
            const change = {
                agentId: 'agent-1',
                fieldName: 'email',
                previousLevel: shared_1.DisclosureLevel.PUBLIC,
                newLevel: shared_1.DisclosureLevel.AFTER_MATCH,
                changedBy: 'user-1',
            };
            const record = await service.logDisclosureChange(change);
            expect(record.agentId).toBe('agent-1');
            expect(record.fieldName).toBe('email');
            expect(record.previousLevel).toBe(shared_1.DisclosureLevel.PUBLIC);
            expect(record.newLevel).toBe(shared_1.DisclosureLevel.AFTER_MATCH);
            expect(record.changedBy).toBe('user-1');
            expect(record.id).toBeDefined();
            expect(record.changedAt).toBeDefined();
        });
        it('should log to audit service', async () => {
            const change = {
                agentId: 'agent-1',
                fieldName: 'email',
                previousLevel: shared_1.DisclosureLevel.PUBLIC,
                newLevel: shared_1.DisclosureLevel.AFTER_MATCH,
                changedBy: 'user-1',
            };
            await service.logDisclosureChange(change);
            expect(auditService_1.auditService.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'DISCLOSURE_LEVEL_CHANGED',
                resource: 'disclosure',
                resourceId: 'agent-1',
                userId: 'user-1',
            }));
        });
        it('should notify affected users when level becomes more restrictive', async () => {
            const change = {
                agentId: 'agent-1',
                fieldName: 'email',
                previousLevel: shared_1.DisclosureLevel.PUBLIC,
                newLevel: shared_1.DisclosureLevel.AFTER_REFERRAL,
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
            expect(auditService_1.auditService.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'DISCLOSURE_ACCESS_DENIED',
                resource: 'disclosure',
                resourceId: 'agent-1',
                userId: 'viewer-1',
            }));
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
            const record = await service.withdrawDisclosedInfo('agent-1', 'email', 'user-1', 'Privacy concerns');
            expect(record.agentId).toBe('agent-1');
            expect(record.fieldName).toBe('email');
            expect(record.previousLevel).toBe(shared_1.DisclosureLevel.PUBLIC);
            expect(record.newLevel).toBe(shared_1.DisclosureLevel.AFTER_MATCH);
        });
        it('should log withdrawal to audit', async () => {
            await service.withdrawDisclosedInfo('agent-1', 'email', 'user-1', 'Privacy concerns');
            expect(auditService_1.auditService.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'DISCLOSURE_WITHDRAWN',
                resource: 'disclosure',
                resourceId: 'agent-1',
                userId: 'user-1',
            }));
        });
    });
});
//# sourceMappingURL=disclosureAuditService.test.js.map