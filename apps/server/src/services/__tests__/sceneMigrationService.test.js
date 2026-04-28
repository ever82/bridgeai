"use strict";
/**
 * @jest-environment node
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Scene Migration Service Tests
 * 场景迁移服务测试
 */
const sceneMigrationService_1 = require("../sceneMigrationService");
const client_1 = require("../../db/client");
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
            const plan = (0, sceneMigrationService_1.generateMigrationPlan)('visionshare', 'agentdate');
            expect(plan).toBeDefined();
            expect(plan.fromScene).toBe('visionshare');
            expect(plan.toScene).toBe('agentdate');
            expect(plan.fieldMappings).toBeDefined();
            expect(plan.transformations).toBeDefined();
            expect(plan.warnings).toBeDefined();
        });
        it('should throw error for invalid source scene', () => {
            expect(() => (0, sceneMigrationService_1.generateMigrationPlan)('invalid', 'agentdate')).toThrow('Invalid scene IDs');
        });
        it('should throw error for invalid target scene', () => {
            expect(() => (0, sceneMigrationService_1.generateMigrationPlan)('visionshare', 'invalid')).toThrow('Invalid scene IDs');
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
            client_1.prisma.agentProfile.findFirst.mockResolvedValue(mockProfile);
            const preview = await (0, sceneMigrationService_1.previewMigration)('agent-1', 'visionshare', 'agentdate');
            expect(preview).toBeDefined();
            expect(preview.migration).toBeDefined();
            expect(preview.currentData).toBeDefined();
            expect(preview.previewData).toBeDefined();
            expect(preview.willLoseData).toBeDefined();
            expect(preview.needsManualInput).toBeDefined();
        });
        it('should throw error when profile not found', async () => {
            client_1.prisma.agentProfile.findFirst.mockResolvedValue(null);
            await expect((0, sceneMigrationService_1.previewMigration)('agent-1', 'visionshare', 'agentdate')).rejects.toThrow('Agent profile not found');
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
            client_1.prisma.agentProfile.findFirst
                .mockResolvedValueOnce(mockProfile)
                .mockResolvedValueOnce(null);
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            client_1.prisma.agentProfile.create.mockResolvedValue(mockNewProfile);
            const result = await (0, sceneMigrationService_1.executeMigration)('agent-1', 'visionshare', 'agentdate');
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
            client_1.prisma.agentProfile.findFirst
                .mockResolvedValueOnce(mockProfile)
                .mockResolvedValueOnce(mockExistingProfile);
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            client_1.prisma.agentProfile.update.mockResolvedValue(mockExistingProfile);
            const result = await (0, sceneMigrationService_1.executeMigration)('agent-1', 'visionshare', 'agentdate');
            expect(result.success).toBe(true);
            expect(client_1.prisma.agentProfile.update).toHaveBeenCalled();
        });
        it('should throw error when agent not found', async () => {
            const mockProfile = {
                id: 'profile-1',
                agentId: 'agent-1',
                sceneId: 'visionshare',
                l2Data: {},
            };
            client_1.prisma.agentProfile.findFirst.mockResolvedValue(mockProfile);
            client_1.prisma.agent.findUnique.mockResolvedValue(null);
            await expect((0, sceneMigrationService_1.executeMigration)('agent-1', 'visionshare', 'agentdate')).rejects.toThrow('Agent not found');
        });
    });
    describe('validateMigration', () => {
        it('should validate valid migration', () => {
            const result = (0, sceneMigrationService_1.validateMigration)('visionshare', 'agentdate');
            expect(result.valid).toBe(true);
            expect(result.reason).toBeUndefined();
        });
        it('should invalidate same scene migration', () => {
            const result = (0, sceneMigrationService_1.validateMigration)('visionshare', 'visionshare');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('same');
        });
        it('should invalidate invalid source scene', () => {
            const result = (0, sceneMigrationService_1.validateMigration)('invalid', 'agentdate');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('source');
        });
        it('should invalidate invalid target scene', () => {
            const result = (0, sceneMigrationService_1.validateMigration)('visionshare', 'invalid');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('target');
        });
    });
    describe('estimateDataLoss', () => {
        it('should estimate data loss between scenes', () => {
            const estimate = (0, sceneMigrationService_1.estimateDataLoss)('visionshare', 'agentdate');
            expect(estimate).toBeDefined();
            expect(estimate.willLoseData).toBeDefined();
            expect(estimate.lossPercentage).toBeDefined();
            expect(estimate.lostFields).toBeDefined();
            expect(typeof estimate.willLoseData).toBe('boolean');
            expect(typeof estimate.lossPercentage).toBe('number');
            expect(Array.isArray(estimate.lostFields)).toBe(true);
        });
        it('should return zero loss for same scene', () => {
            const estimate = (0, sceneMigrationService_1.estimateDataLoss)('visionshare', 'visionshare');
            expect(estimate.lossPercentage).toBe(0);
            expect(estimate.lostFields).toHaveLength(0);
        });
        it('should handle invalid scenes gracefully', () => {
            const estimate = (0, sceneMigrationService_1.estimateDataLoss)('invalid', 'agentdate');
            expect(estimate.willLoseData).toBe(false);
            expect(estimate.lossPercentage).toBe(0);
        });
    });
});
//# sourceMappingURL=sceneMigrationService.test.js.map