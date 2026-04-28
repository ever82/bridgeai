"use strict";
/**
 * Cross-Module Credit Integration Tests
 * ISSUE-INT001c: 跨模块集成与测试框架基础设施
 * Tests C005~c1 (信用筛选) and C005~c2 (门槛设置)
 *
 * These are integration tests that run against a real PostgreSQL database.
 * They use TEST_DATABASE_URL to connect to the test database.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const shared_1 = require("@bridgeai/shared");
const creditFilterService_1 = require("../services/creditFilterService");
const creditThresholds_1 = require("../config/creditThresholds");
// Real Prisma client for integration tests
const prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
    },
});
// Track test data for cleanup
const createdUserIds = [];
const createdAgentIds = [];
async function cleanupTestData() {
    // Delete in reverse dependency order
    await prisma.creditScore.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.agent.deleteMany({ where: { id: { in: createdAgentIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
    createdAgentIds.length = 0;
}
// Helper to create test user with credit score
async function createTestUserWithCredit(email, creditScore) {
    const user = await prisma.user.create({
        data: {
            email,
            passwordHash: '$2b$10$testhash',
            name: 'Test User',
            creditScores: {
                create: {
                    score: creditScore,
                    level: (0, creditFilterService_1.getCreditLevel)(creditScore) || 'general',
                },
            },
        },
    });
    const agent = await prisma.agent.create({
        data: {
            userId: user.id,
            type: client_1.AgentType.VISIONSHARE,
            name: `Test Agent for ${email}`,
            status: 'ACTIVE',
            creditScore,
        },
    });
    createdUserIds.push(user.id);
    createdAgentIds.push(agent.id);
    return { userId: user.id, agentId: agent.id };
}
describe('ISSUE-C005~c1: 信用筛选 Integration Tests', () => {
    beforeEach(() => {
        (0, creditThresholds_1.resetSceneThresholds)();
    });
    afterAll(async () => {
        await cleanupTestData();
    });
    // ===== 最低信用分设置 (Minimum Credit Score Setting) =====
    describe('最低信用分设置 (Minimum Credit Score)', () => {
        it('should filter agents with credit score >= minimum threshold', async () => {
            const { agentId: agent1Id } = await createTestUserWithCredit(`agent-1-${Date.now()}@test.com`, 700);
            const { agentId: agent2Id } = await createTestUserWithCredit(`agent-2-${Date.now()}@test.com`, 650);
            const result = await (0, creditFilterService_1.filterAgentsByCredit)({ minCreditScore: 600 });
            expect(result.total).toBeGreaterThanOrEqual(2);
            const filteredAgents = result.items.filter(a => a.id === agent1Id || a.id === agent2Id);
            expect(filteredAgents.length).toBe(2);
            expect(filteredAgents.every(a => a.creditScore >= 600)).toBe(true);
        });
        it('should exclude agents below minimum credit score', async () => {
            const { agentId } = await createTestUserWithCredit(`below-threshold-${Date.now()}@test.com`, 300);
            const result = await (0, creditFilterService_1.filterAgentsByCredit)({ minCreditScore: 600 });
            const filteredAgents = result.items.filter(a => a.id === agentId);
            expect(filteredAgents.length).toBe(0);
        });
        it('should build correct Prisma condition for minimum score', () => {
            const options = { minCreditScore: 600 };
            const condition = (0, creditFilterService_1.buildCreditFilterCondition)(options);
            expect(condition).toEqual({
                user: {
                    creditScores: {
                        some: {
                            score: { gte: 600 },
                        },
                    },
                },
            });
        });
        it('should handle edge case at minimum score boundary', async () => {
            const { agentId } = await createTestUserWithCredit(`boundary-${Date.now()}@test.com`, 600);
            const result = await (0, creditFilterService_1.filterAgentsByCredit)({ minCreditScore: 600 });
            const filteredAgents = result.items.filter(a => a.id === agentId);
            expect(filteredAgents.length).toBe(1);
            expect(filteredAgents[0].creditScore).toBe(600);
        });
    });
    // ===== 信用分范围筛选 (Credit Score Range Filtering) =====
    describe('信用分范围筛选 (Credit Score Range Filtering)', () => {
        it('should filter agents within specified score range', async () => {
            const { agentId: agent1Id } = await createTestUserWithCredit(`range-1-${Date.now()}@test.com`, 700);
            const { agentId: agent2Id } = await createTestUserWithCredit(`range-2-${Date.now()}@test.com`, 650);
            const result = await (0, creditFilterService_1.filterAgentsByCredit)({ minCreditScore: 600, maxCreditScore: 750 });
            expect(result.total).toBeGreaterThanOrEqual(2);
            const filteredAgents = result.items.filter(a => a.id === agent1Id || a.id === agent2Id);
            expect(filteredAgents.length).toBe(2);
            expect(filteredAgents.every(a => a.creditScore >= 600 && a.creditScore <= 750)).toBe(true);
        });
        it('should build correct Prisma condition for score range', () => {
            const options = { minCreditScore: 600, maxCreditScore: 750 };
            const condition = (0, creditFilterService_1.buildCreditFilterCondition)(options);
            expect(condition).toEqual({
                user: {
                    creditScores: {
                        some: {
                            score: { gte: 600, lte: 750 },
                        },
                    },
                },
            });
        });
        it('should filter agents within excellent range (900-1000)', async () => {
            const { agentId: agent1Id } = await createTestUserWithCredit(`excellent-1-${Date.now()}@test.com`, 950);
            const { agentId: agent2Id } = await createTestUserWithCredit(`excellent-2-${Date.now()}@test.com`, 920);
            const result = await (0, creditFilterService_1.filterAgentsByCredit)({ minCreditScore: 900, maxCreditScore: 1000 });
            expect(result.total).toBeGreaterThanOrEqual(2);
            const filteredAgents = result.items.filter(a => a.id === agent1Id || a.id === agent2Id);
            expect(filteredAgents.length).toBe(2);
            expect(filteredAgents.every(a => a.creditLevel === 'excellent')).toBe(true);
        });
        it('should handle narrow range filtering', async () => {
            const { agentId } = await createTestUserWithCredit(`narrow-${Date.now()}@test.com`, 600);
            const result = await (0, creditFilterService_1.filterAgentsByCredit)({ minCreditScore: 600, maxCreditScore: 600 });
            const filteredAgents = result.items.filter(a => a.id === agentId);
            expect(filteredAgents.length).toBe(1);
            expect(filteredAgents[0].creditScore).toBe(600);
        });
    });
    // ===== 信用等级筛选 (Credit Level Filtering) =====
    describe('信用等级筛选 (Credit Level Filtering)', () => {
        it('should filter by excellent level', async () => {
            const { agentId } = await createTestUserWithCredit(`excellent-${Date.now()}@test.com`, 950);
            const result = await (0, creditFilterService_1.filterAgentsByCredit)({ creditLevel: 'excellent' });
            const filteredAgents = result.items.filter(a => a.id === agentId);
            expect(filteredAgents.length).toBe(1);
            expect(filteredAgents[0].creditLevel).toBe('excellent');
            expect(filteredAgents[0].creditScore).toBe(950);
        });
        it('should filter by good level', async () => {
            const { agentId } = await createTestUserWithCredit(`good-${Date.now()}@test.com`, 800);
            const result = await (0, creditFilterService_1.filterAgentsByCredit)({ creditLevel: 'good' });
            const filteredAgents = result.items.filter(a => a.id === agentId);
            expect(filteredAgents.length).toBe(1);
            expect(filteredAgents[0].creditLevel).toBe('good');
            expect(filteredAgents[0].creditScore).toBe(800);
        });
        it('should filter by general level', async () => {
            const { agentId } = await createTestUserWithCredit(`general-${Date.now()}@test.com`, 650);
            const result = await (0, creditFilterService_1.filterAgentsByCredit)({ creditLevel: 'general' });
            const filteredAgents = result.items.filter(a => a.id === agentId);
            expect(filteredAgents.length).toBe(1);
            expect(filteredAgents[0].creditLevel).toBe('general');
            expect(filteredAgents[0].creditScore).toBe(650);
        });
        it('should filter by multiple credit levels', async () => {
            const { agentId: agent1Id } = await createTestUserWithCredit(`multi-1-${Date.now()}@test.com`, 950);
            const { agentId: agent2Id } = await createTestUserWithCredit(`multi-2-${Date.now()}@test.com`, 800);
            const result = await (0, creditFilterService_1.filterAgentsByCredit)({ creditLevel: ['excellent', 'good'] });
            expect(result.total).toBeGreaterThanOrEqual(2);
            const filteredAgents = result.items.filter(a => a.id === agent1Id || a.id === agent2Id);
            expect(filteredAgents.length).toBe(2);
            expect(filteredAgents.every(a => a.creditLevel === 'excellent' || a.creditLevel === 'good')).toBe(true);
        });
        it('should build correct OR condition for multiple levels', () => {
            const options = { creditLevel: ['excellent', 'good'] };
            const condition = (0, creditFilterService_1.buildCreditFilterCondition)(options);
            expect(condition).toEqual({
                OR: [
                    {
                        user: {
                            creditScores: {
                                some: {
                                    score: { gte: 900, lte: 1000 },
                                },
                            },
                        },
                    },
                    {
                        user: {
                            creditScores: {
                                some: {
                                    score: { gte: 750, lte: 899 },
                                },
                            },
                        },
                    },
                ],
            });
        });
        it('should get correct credit level from score', () => {
            expect((0, creditFilterService_1.getCreditLevel)(950)).toBe('excellent');
            expect((0, creditFilterService_1.getCreditLevel)(800)).toBe('good');
            expect((0, creditFilterService_1.getCreditLevel)(650)).toBe('general');
            expect((0, creditFilterService_1.getCreditLevel)(300)).toBe('poor');
        });
        it('should have correct thresholds from shared config', () => {
            expect(shared_1.CREDIT_LEVEL_THRESHOLDS.excellent).toEqual({ min: 900, max: 1000 });
            expect(shared_1.CREDIT_LEVEL_THRESHOLDS.good).toEqual({ min: 750, max: 899 });
            expect(shared_1.CREDIT_LEVEL_THRESHOLDS.general).toEqual({ min: 600, max: 749 });
            expect(shared_1.CREDIT_LEVEL_THRESHOLDS.poor).toEqual({ min: 0, max: 599 });
        });
    });
    // ===== 无信用分处理 (Handling No Credit Score) =====
    describe('无信用分处理 (No Credit Score Handling)', () => {
        it('should exclude agents without credit score by default', async () => {
            const { agentId } = await createTestUserWithCredit(`with-credit-${Date.now()}@test.com`, 700);
            const result = await (0, creditFilterService_1.filterAgentsByCredit)({ minCreditScore: 600 });
            const filteredAgents = result.items.filter(a => a.id === agentId);
            expect(filteredAgents.length).toBe(1);
            expect(filteredAgents[0].creditScore).toBe(700);
        });
        it('should build condition to include no-credit agents', () => {
            const options = { includeNoCredit: true };
            const condition = (0, creditFilterService_1.buildCreditFilterCondition)(options);
            expect(condition).toEqual({
                user: {
                    creditScores: {
                        none: {},
                    },
                },
            });
        });
        it('should combine min score with includeNoCredit', () => {
            const options = { minCreditScore: 600, includeNoCredit: true };
            const condition = (0, creditFilterService_1.buildCreditFilterCondition)(options);
            expect(condition).toEqual({
                OR: [
                    { user: { creditScores: { some: { score: { gte: 600 } } } } },
                    { user: { creditScores: { none: {} } } },
                ],
            });
        });
        it('should handle threshold check for agent without credit score', async () => {
            // Create an agent with no credit score
            const user = await prisma.user.create({
                data: {
                    email: `no-credit-${Date.now()}@test.com`,
                    passwordHash: '$2b$10$testhash',
                },
            });
            const agent = await prisma.agent.create({
                data: {
                    userId: user.id,
                    type: client_1.AgentType.VISIONSHARE,
                    name: 'No Credit Agent',
                    status: 'ACTIVE',
                },
            });
            createdUserIds.push(user.id);
            createdAgentIds.push(agent.id);
            const result = await (0, creditFilterService_1.checkCreditThreshold)(agent.id, 600);
            expect(result.meetsThreshold).toBe(false);
            expect(result.agentScore).toBeNull();
            expect(result.agentLevel).toBeNull();
            expect(result.gap).toBe(600);
        });
        it('should return null credit level for agents without score', () => {
            expect((0, creditFilterService_1.getCreditLevel)(null)).toBeNull();
            expect((0, creditFilterService_1.getCreditLevel)(undefined)).toBeNull();
        });
    });
});
describe('ISSUE-C005~c2: 门槛设置 Integration Tests', () => {
    beforeEach(() => {
        (0, creditThresholds_1.resetSceneThresholds)();
    });
    // ===== 场景特定的信用门槛 (Scene-Specific Credit Thresholds) =====
    describe('场景特定的信用门槛 (Scene-Specific Thresholds)', () => {
        it('should have default thresholds for all major scenes', () => {
            const visionshare = (0, creditThresholds_1.getSceneThreshold)('visionshare');
            const agentdate = (0, creditThresholds_1.getSceneThreshold)('agentdate');
            const agentjob = (0, creditThresholds_1.getSceneThreshold)('agentjob');
            const agentad = (0, creditThresholds_1.getSceneThreshold)('agentad');
            expect(visionshare).toBeDefined();
            expect(visionshare?.minCreditScore).toBe(500);
            expect(visionshare?.minCreditLevel).toBe('general');
            expect(agentdate).toBeDefined();
            expect(agentdate?.minCreditScore).toBe(600);
            expect(agentdate?.minCreditLevel).toBe('good');
            expect(agentjob).toBeDefined();
            expect(agentjob?.minCreditScore).toBe(400);
            expect(agentjob?.minCreditLevel).toBe('general');
            expect(agentad).toBeDefined();
            expect(agentad?.minCreditScore).toBe(500);
            expect(agentad?.minCreditLevel).toBe('general');
        });
        it('should enforce higher threshold for agentdate scene', async () => {
            const { agentId } = await createTestUserWithCredit(`agentdate-${Date.now()}@test.com`, 550);
            const result = await (0, creditFilterService_1.checkCreditThreshold)(agentId, 600);
            expect(result.meetsThreshold).toBe(false);
            expect(result.agentScore).toBe(550);
        });
        it('scene thresholds should be active by default', () => {
            const visionshare = (0, creditThresholds_1.getSceneThreshold)('visionshare');
            expect(visionshare?.isActive).toBe(true);
            const agentdate = (0, creditThresholds_1.getSceneThreshold)('agentdate');
            expect(agentdate?.isActive).toBe(true);
        });
        it('should return undefined for non-existent scene', () => {
            const nonexistent = (0, creditThresholds_1.getSceneThreshold)('nonexistent');
            expect(nonexistent).toBeUndefined();
        });
    });
    // ===== 动态门槛调整 (Dynamic Threshold Adjustment) =====
    describe('动态门槛调整 (Dynamic Threshold Adjustment)', () => {
        it('should update scene threshold dynamically', () => {
            const updated = (0, creditThresholds_1.updateSceneThreshold)('visionshare', { minCreditScore: 700 });
            expect(updated).toBeDefined();
            expect(updated?.minCreditScore).toBe(700);
            expect(updated?.sceneId).toBe('visionshare');
            expect(updated?.sceneName).toBe('视觉分享');
        });
        it('should preserve other fields when updating threshold', () => {
            const before = (0, creditThresholds_1.getSceneThreshold)('visionshare');
            const updated = (0, creditThresholds_1.updateSceneThreshold)('visionshare', { minCreditScore: 750 });
            expect(updated?.sceneId).toBe(before?.sceneId);
            expect(updated?.sceneName).toBe(before?.sceneName);
            expect(updated?.isActive).toBe(before?.isActive);
            expect(updated?.minCreditLevel).toBe(before?.minCreditLevel);
        });
        it('should update threshold and get notification', () => {
            const oldThreshold = 500;
            const newThreshold = 700;
            const updated = (0, creditThresholds_1.updateSceneThreshold)('visionshare', { minCreditScore: newThreshold });
            const notification = (0, creditThresholds_1.getThresholdChangeNotification)('visionshare', oldThreshold, newThreshold);
            expect(updated?.minCreditScore).toBe(700);
            expect(notification.title).toContain('提高');
            expect(notification.message).toContain('500');
            expect(notification.message).toContain('700');
        });
        it('should return notification for threshold decrease', () => {
            const notification = (0, creditThresholds_1.getThresholdChangeNotification)('visionshare', 700, 500);
            expect(notification.title).toContain('降低');
            expect(notification.message).toContain('500');
        });
        it('should return undefined for updating non-existent scene', () => {
            const updated = (0, creditThresholds_1.updateSceneThreshold)('nonexistent', { minCreditScore: 700 });
            expect(updated).toBeUndefined();
        });
        it('should update minCreditLevel with threshold', () => {
            const updated = (0, creditThresholds_1.updateSceneThreshold)('visionshare', {
                minCreditScore: 850,
                minCreditLevel: 'excellent',
            });
            expect(updated?.minCreditScore).toBe(850);
            expect(updated?.minCreditLevel).toBe('excellent');
        });
        it('should toggle threshold active status', () => {
            const updated = (0, creditThresholds_1.updateSceneThreshold)('visionshare', { isActive: false });
            expect(updated?.isActive).toBe(false);
            const reactivated = (0, creditThresholds_1.updateSceneThreshold)('visionshare', { isActive: true });
            expect(reactivated?.isActive).toBe(true);
        });
    });
    // ===== 门槛豁免机制 (Threshold Exemption Mechanism) =====
    describe('门槛豁免机制 (Threshold Exemption Mechanism)', () => {
        it('should grant user exemption', () => {
            const rule = (0, creditThresholds_1.addExemptionRule)('visionshare', {
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
            const rule = (0, creditThresholds_1.addExemptionRule)('visionshare', {
                name: 'Trusted Agent',
                type: 'agent',
                targetIds: ['agent-456'],
            });
            expect(rule?.type).toBe('agent');
            expect(rule?.targetIds).toContain('agent-456');
        });
        it('should grant promotion exemption (applies to all)', () => {
            const rule = (0, creditThresholds_1.addExemptionRule)('visionshare', {
                name: 'New Year Promotion',
                type: 'promotion',
            });
            expect(rule?.type).toBe('promotion');
        });
        it('should check if user is exempted', () => {
            (0, creditThresholds_1.addExemptionRule)('visionshare', {
                name: 'VIP User',
                type: 'user',
                targetIds: ['user-123'],
            });
            const result = (0, creditThresholds_1.isUserExempted)('visionshare', 'user-123');
            expect(result.exempted).toBe(true);
            expect(result.rule?.name).toBe('VIP User');
        });
        it('should return false for non-exempted user', () => {
            const result = (0, creditThresholds_1.isUserExempted)('visionshare', 'user-999');
            expect(result.exempted).toBe(false);
            expect(result.rule).toBeUndefined();
        });
        it('should skip expired exemptions', () => {
            (0, creditThresholds_1.addExemptionRule)('visionshare', {
                name: 'Expired Exemption',
                type: 'user',
                targetIds: ['user-123'],
                validUntil: new Date('2020-01-01'),
            });
            const result = (0, creditThresholds_1.isUserExempted)('visionshare', 'user-123');
            expect(result.exempted).toBe(false);
        });
        it('should keep valid exemptions', () => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            (0, creditThresholds_1.addExemptionRule)('visionshare', {
                name: 'Valid Exemption',
                type: 'user',
                targetIds: ['user-123'],
                validUntil: futureDate,
            });
            const result = (0, creditThresholds_1.isUserExempted)('visionshare', 'user-123');
            expect(result.exempted).toBe(true);
        });
        it('should remove exemption rule', () => {
            const rule = (0, creditThresholds_1.addExemptionRule)('visionshare', {
                name: 'Temporary Exemption',
                type: 'user',
                targetIds: ['user-123'],
            });
            const removed = (0, creditThresholds_1.removeExemptionRule)('visionshare', rule.id);
            expect(removed).toBe(true);
            const result = (0, creditThresholds_1.isUserExempted)('visionshare', 'user-123');
            expect(result.exempted).toBe(false);
        });
        it('should return false when removing non-existent rule', () => {
            const removed = (0, creditThresholds_1.removeExemptionRule)('visionshare', 'nonexistent-rule');
            expect(removed).toBe(false);
        });
        it('should check exemption with credit score below threshold', () => {
            (0, creditThresholds_1.addExemptionRule)('visionshare', {
                name: 'VIP',
                type: 'user',
                targetIds: ['user-123'],
            });
            const result = (0, creditThresholds_1.checkSceneCreditThreshold)('visionshare', 100, 'user-123');
            expect(result.meetsThreshold).toBe(true);
            expect(result.exempted).toBe(true);
            expect(result.exemptionRule?.name).toBe('VIP');
        });
        it('should check agent exemption', () => {
            (0, creditThresholds_1.addExemptionRule)('visionshare', {
                name: 'Trusted Agent',
                type: 'agent',
                targetIds: ['agent-123'],
            });
            const result = (0, creditThresholds_1.checkSceneCreditThreshold)('visionshare', 100, 'user-456', 'agent-123');
            expect(result.meetsThreshold).toBe(true);
            expect(result.exempted).toBe(true);
        });
        it('should support manual exemption type', () => {
            const rule = (0, creditThresholds_1.addExemptionRule)('visionshare', {
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
            const notification = (0, creditThresholds_1.getThresholdChangeNotification)('visionshare', 500, 700);
            expect(notification.title).toContain('提高');
            expect(notification.message).toContain('500');
            expect(notification.message).toContain('700');
        });
        it('should send notification on threshold decrease', () => {
            const notification = (0, creditThresholds_1.getThresholdChangeNotification)('visionshare', 700, 400);
            expect(notification.title).toContain('降低');
            expect(notification.message).toContain('700');
            expect(notification.message).toContain('400');
        });
        it('should include scene name in notification', () => {
            const notification = (0, creditThresholds_1.getThresholdChangeNotification)('agentdate', 600, 700);
            expect(notification.title).toContain('Agent约会');
            expect(notification.message).toContain('Agent约会');
        });
        it('should use sceneId when scene not found', () => {
            const notification = (0, creditThresholds_1.getThresholdChangeNotification)('custom-scene', 500, 600);
            expect(notification.title).toContain('custom-scene');
        });
        it('should generate insufficient credit notification', () => {
            const notification = (0, creditThresholds_1.getInsufficientCreditNotification)('visionshare', 400, 600);
            expect(notification.title).toContain('信用分不足');
            expect(notification.message).toContain('400');
            expect(notification.message).toContain('600');
            expect(notification.message).toContain('200'); // gap
        });
        it('should handle null score in insufficient notification', () => {
            const notification = (0, creditThresholds_1.getInsufficientCreditNotification)('visionshare', null, 600);
            expect(notification.title).toContain('信用分不足');
            expect(notification.message).toContain('无');
            expect(notification.message).toContain('600');
        });
        it('should send insufficient credit notification for scene', () => {
            const notification = (0, creditThresholds_1.getInsufficientCreditNotification)('agentdate', 500, 600);
            expect(notification.title).toContain('Agent约会');
            expect(notification.message).toContain('500');
        });
    });
    // ===== Cross-Module Integration =====
    describe('Cross-Module Integration (C005~c1 + C005~c2)', () => {
        it('should filter by credit and enforce scene threshold together', () => {
            const threshold = (0, creditThresholds_1.getSceneThreshold)('visionshare');
            const options = { minCreditScore: threshold.minCreditScore };
            const condition = (0, creditFilterService_1.buildCreditFilterCondition)(options);
            expect(condition.user.creditScores.some.score.gte).toBe(500);
        });
        it('should exempt user from scene threshold filtering', () => {
            (0, creditThresholds_1.addExemptionRule)('visionshare', {
                name: 'VIP',
                type: 'user',
                targetIds: ['user-exempt'],
            });
            const exemption = (0, creditThresholds_1.isUserExempted)('visionshare', 'user-exempt');
            const thresholdResult = (0, creditThresholds_1.checkSceneCreditThreshold)('visionshare', 100, 'user-exempt');
            expect(exemption.exempted).toBe(true);
            expect(thresholdResult.meetsThreshold).toBe(true);
            expect(thresholdResult.exempted).toBe(true);
        });
        it('should allow level-based filtering across different scenes', () => {
            const visionshare = (0, creditThresholds_1.getSceneThreshold)('visionshare');
            const agentdate = (0, creditThresholds_1.getSceneThreshold)('agentdate');
            // visionshare requires 'general' level
            expect(visionshare.minCreditLevel).toBe('general');
            // agentdate requires 'good' level (min 750)
            expect(agentdate.minCreditLevel).toBe('good');
        });
        it('should handle no-credit users with scene exemptions', () => {
            (0, creditThresholds_1.addExemptionRule)('visionshare', {
                name: 'New User Promotion',
                type: 'promotion',
            });
            const result = (0, creditThresholds_1.checkSceneCreditThreshold)('visionshare', null, 'any-user');
            expect(result.meetsThreshold).toBe(true);
            expect(result.exempted).toBe(true);
        });
        it('should update threshold and reflect in filter', () => {
            (0, creditThresholds_1.updateSceneThreshold)('visionshare', { minCreditScore: 800 });
            const threshold = (0, creditThresholds_1.getSceneThreshold)('visionshare');
            const options = { minCreditScore: threshold.minCreditScore };
            const condition = (0, creditFilterService_1.buildCreditFilterCondition)(options);
            expect(condition.user.creditScores.some.score.gte).toBe(800);
        });
    });
});
//# sourceMappingURL=creditIntegration.test.js.map