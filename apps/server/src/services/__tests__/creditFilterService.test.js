"use strict";
/**
 * Credit Filter Service Tests
 * 信用分过滤服务测试
 */
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("@bridgeai/shared");
const creditFilterService_1 = require("../creditFilterService");
const client_1 = require("../../db/client");
const logger_1 = require("../../utils/logger");
// Mock Prisma
jest.mock('../../db/client', () => ({
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
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));
describe('CreditFilterService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('getCreditLevel', () => {
        it('should return correct level for excellent score', () => {
            expect((0, creditFilterService_1.getCreditLevel)(950)).toBe('excellent');
            expect((0, creditFilterService_1.getCreditLevel)(900)).toBe('excellent');
            expect((0, creditFilterService_1.getCreditLevel)(1000)).toBe('excellent');
        });
        it('should return correct level for good score', () => {
            expect((0, creditFilterService_1.getCreditLevel)(800)).toBe('good');
            expect((0, creditFilterService_1.getCreditLevel)(750)).toBe('good');
            expect((0, creditFilterService_1.getCreditLevel)(899)).toBe('good');
        });
        it('should return correct level for general score', () => {
            expect((0, creditFilterService_1.getCreditLevel)(650)).toBe('general');
            expect((0, creditFilterService_1.getCreditLevel)(600)).toBe('general');
            expect((0, creditFilterService_1.getCreditLevel)(749)).toBe('general');
        });
        it('should return correct level for poor score', () => {
            expect((0, creditFilterService_1.getCreditLevel)(300)).toBe('poor');
            expect((0, creditFilterService_1.getCreditLevel)(0)).toBe('poor');
            expect((0, creditFilterService_1.getCreditLevel)(599)).toBe('poor');
        });
        it('should return null for null or undefined score', () => {
            expect((0, creditFilterService_1.getCreditLevel)(null)).toBeNull();
            expect((0, creditFilterService_1.getCreditLevel)(undefined)).toBeNull();
        });
    });
    describe('getCreditLevelLabel', () => {
        it('should return correct labels for each level', () => {
            expect((0, creditFilterService_1.getCreditLevelLabel)('excellent')).toBe('优秀');
            expect((0, creditFilterService_1.getCreditLevelLabel)('good')).toBe('良好');
            expect((0, creditFilterService_1.getCreditLevelLabel)('general')).toBe('一般');
            expect((0, creditFilterService_1.getCreditLevelLabel)('poor')).toBe('较差');
        });
        it('should return "无信用分" for null level', () => {
            expect((0, creditFilterService_1.getCreditLevelLabel)(null)).toBe('无信用分');
        });
    });
    describe('getCreditLevelColor', () => {
        it('should return correct colors for each level', () => {
            expect((0, creditFilterService_1.getCreditLevelColor)('excellent')).toBe('#4CAF50');
            expect((0, creditFilterService_1.getCreditLevelColor)('good')).toBe('#8BC34A');
            expect((0, creditFilterService_1.getCreditLevelColor)('general')).toBe('#FFC107');
            expect((0, creditFilterService_1.getCreditLevelColor)('poor')).toBe('#FF5722');
        });
        it('should return gray color for null level', () => {
            expect((0, creditFilterService_1.getCreditLevelColor)(null)).toBe('#9E9E9E');
        });
    });
    describe('buildCreditFilterCondition', () => {
        it('should build condition for min credit score', () => {
            const options = { minCreditScore: 600 };
            const condition = (0, creditFilterService_1.buildCreditFilterCondition)(options);
            expect(condition).toEqual({
                user: {
                    creditScores: {
                        some: {
                            score: {
                                gte: 600,
                            },
                        },
                    },
                },
            });
        });
        it('should build condition for max credit score', () => {
            const options = { maxCreditScore: 800 };
            const condition = (0, creditFilterService_1.buildCreditFilterCondition)(options);
            expect(condition).toEqual({
                user: {
                    creditScores: {
                        some: {
                            score: {
                                lte: 800,
                            },
                        },
                    },
                },
            });
        });
        it('should build condition for credit score range', () => {
            const options = { minCreditScore: 600, maxCreditScore: 800 };
            const condition = (0, creditFilterService_1.buildCreditFilterCondition)(options);
            expect(condition).toEqual({
                user: {
                    creditScores: {
                        some: {
                            score: {
                                gte: 600,
                                lte: 800,
                            },
                        },
                    },
                },
            });
        });
        it('should build condition for single credit level', () => {
            const options = { creditLevel: 'excellent' };
            const condition = (0, creditFilterService_1.buildCreditFilterCondition)(options);
            expect(condition).toEqual({
                user: {
                    creditScores: {
                        some: {
                            score: {
                                gte: 900,
                                lte: 1000,
                            },
                        },
                    },
                },
            });
        });
        it('should build condition for multiple credit levels', () => {
            const options = { creditLevel: ['excellent', 'good'] };
            const condition = (0, creditFilterService_1.buildCreditFilterCondition)(options);
            expect(condition).toEqual({
                OR: [
                    {
                        user: {
                            creditScores: {
                                some: {
                                    score: {
                                        gte: 900,
                                        lte: 1000,
                                    },
                                },
                            },
                        },
                    },
                    {
                        user: {
                            creditScores: {
                                some: {
                                    score: {
                                        gte: 750,
                                        lte: 899,
                                    },
                                },
                            },
                        },
                    },
                ],
            });
        });
        it('should build condition to include agents without credit score', () => {
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
        it('should return empty object when no options provided', () => {
            const options = {};
            const condition = (0, creditFilterService_1.buildCreditFilterCondition)(options);
            expect(condition).toEqual({});
        });
        it('should combine multiple conditions with OR', () => {
            const options = {
                minCreditScore: 600,
                includeNoCredit: true,
            };
            const condition = (0, creditFilterService_1.buildCreditFilterCondition)(options);
            expect(condition).toEqual({
                OR: [
                    {
                        user: {
                            creditScores: {
                                some: {
                                    score: {
                                        gte: 600,
                                    },
                                },
                            },
                        },
                    },
                    {
                        user: {
                            creditScores: {
                                none: {},
                            },
                        },
                    },
                ],
            });
        });
    });
    describe('filterAgentsByCredit', () => {
        it('should filter agents by credit score', async () => {
            const mockAgents = [
                {
                    id: 'agent-1',
                    name: 'Agent 1',
                    type: 'VISIONSHARE',
                    user: {
                        creditScores: [{ score: 920 }],
                    },
                },
                {
                    id: 'agent-2',
                    name: 'Agent 2',
                    type: 'VISIONSHARE',
                    user: {
                        creditScores: [{ score: 760 }],
                    },
                },
            ];
            client_1.prisma.agent.findMany.mockResolvedValue(mockAgents);
            client_1.prisma.agent.count.mockResolvedValue(2);
            const result = await (0, creditFilterService_1.filterAgentsByCredit)({ minCreditScore: 600 }, { page: 1, limit: 20 });
            expect(result.items).toHaveLength(2);
            expect(result.total).toBe(2);
            expect(result.items[0].creditScore).toBe(920);
            expect(result.items[0].creditLevel).toBe('excellent');
            expect(result.items[1].creditScore).toBe(760);
            expect(result.items[1].creditLevel).toBe('good');
        });
        it('should handle agents without credit score', async () => {
            const mockAgents = [
                {
                    id: 'agent-1',
                    name: 'Agent 1',
                    type: 'VISIONSHARE',
                    user: {
                        creditScores: [],
                    },
                },
            ];
            client_1.prisma.agent.findMany.mockResolvedValue(mockAgents);
            client_1.prisma.agent.count.mockResolvedValue(1);
            const result = await (0, creditFilterService_1.filterAgentsByCredit)({ includeNoCredit: true });
            expect(result.items).toHaveLength(1);
            expect(result.items[0].creditScore).toBeNull();
            expect(result.items[0].creditLevel).toBeNull();
        });
        it('should handle database errors', async () => {
            const error = new Error('Database error');
            client_1.prisma.agent.findMany.mockRejectedValue(error);
            await expect((0, creditFilterService_1.filterAgentsByCredit)({ minCreditScore: 600 })).rejects.toThrow('Database error');
            expect(logger_1.logger.error).toHaveBeenCalledWith('Failed to filter agents by credit', expect.any(Object));
        });
    });
    describe('checkCreditThreshold', () => {
        it('should return meetsThreshold=true when agent meets threshold', async () => {
            const mockAgent = {
                id: 'agent-1',
                user: {
                    creditScores: [{ score: 750 }],
                },
            };
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            const result = await (0, creditFilterService_1.checkCreditThreshold)('agent-1', 600);
            expect(result.meetsThreshold).toBe(true);
            expect(result.agentScore).toBe(750);
            expect(result.agentLevel).toBe('good');
            expect(result.requiredScore).toBe(600);
            expect(result.gap).toBe(0);
        });
        it('should return meetsThreshold=false when agent does not meet threshold', async () => {
            const mockAgent = {
                id: 'agent-1',
                user: {
                    creditScores: [{ score: 650 }],
                },
            };
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            const result = await (0, creditFilterService_1.checkCreditThreshold)('agent-1', 700);
            expect(result.meetsThreshold).toBe(false);
            expect(result.agentScore).toBe(650);
            expect(result.agentLevel).toBe('general');
            expect(result.requiredScore).toBe(700);
            expect(result.gap).toBe(50);
        });
        it('should handle agent without credit score', async () => {
            const mockAgent = {
                id: 'agent-1',
                user: {
                    creditScores: [],
                },
            };
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            const result = await (0, creditFilterService_1.checkCreditThreshold)('agent-1', 600);
            expect(result.meetsThreshold).toBe(false);
            expect(result.agentScore).toBeNull();
            expect(result.agentLevel).toBeNull();
            expect(result.gap).toBe(600);
        });
        it('should throw error when agent not found', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue(null);
            await expect((0, creditFilterService_1.checkCreditThreshold)('agent-1', 600)).rejects.toThrow('Agent not found');
        });
    });
    describe('getCreditStatistics', () => {
        it('should return credit statistics', async () => {
            const mockScores = [
                { score: 950 },
                { score: 800 },
                { score: 650 },
                { score: 400 },
                { score: 300 },
            ];
            client_1.prisma.creditScore.findMany.mockResolvedValue(mockScores);
            client_1.prisma.user.count.mockResolvedValue(3);
            const result = await (0, creditFilterService_1.getCreditStatistics)();
            expect(result.total).toBe(8); // 5 with score + 3 without
            expect(result.byLevel.excellent).toBe(1);
            expect(result.byLevel.good).toBe(1);
            expect(result.byLevel.general).toBe(1);
            expect(result.byLevel.poor).toBe(2);
            expect(result.noCredit).toBe(3);
            expect(result.average).toBe(620); // (950+800+650+400+300) / 5
        });
        it('should handle empty scores', async () => {
            client_1.prisma.creditScore.findMany.mockResolvedValue([]);
            client_1.prisma.user.count.mockResolvedValue(0);
            const result = await (0, creditFilterService_1.getCreditStatistics)();
            expect(result.total).toBe(0);
            expect(result.average).toBe(0);
        });
        it('should handle database errors', async () => {
            const error = new Error('Database error');
            client_1.prisma.creditScore.findMany.mockRejectedValue(error);
            await expect((0, creditFilterService_1.getCreditStatistics)()).rejects.toThrow('Database error');
            expect(logger_1.logger.error).toHaveBeenCalledWith('Failed to get credit statistics', expect.any(Object));
        });
    });
    describe('addCreditFilterToDSL', () => {
        it('should add credit filter to existing AND filter', () => {
            const dsl = {
                where: {
                    and: [{ field: 'status', operator: 'eq', value: 'ACTIVE' }],
                },
            };
            const result = (0, creditFilterService_1.addCreditFilterToDSL)(dsl, { minCreditScore: 600 });
            expect(result.where).toEqual({
                and: [
                    { field: 'status', operator: 'eq', value: 'ACTIVE' },
                    { field: 'user.creditScore.score', operator: 'gte', value: 600 },
                ],
            });
        });
        it('should create AND filter when DSL has simple condition', () => {
            const dsl = {
                where: {
                    field: 'status',
                    operator: 'eq',
                    value: 'ACTIVE',
                },
            };
            const result = (0, creditFilterService_1.addCreditFilterToDSL)(dsl, { minCreditScore: 600 });
            expect(result.where).toEqual({
                and: [
                    { field: 'status', operator: 'eq', value: 'ACTIVE' },
                    { field: 'user.creditScore.score', operator: 'gte', value: 600 },
                ],
            });
        });
        it('should use default minCreditScore of 0 when not provided', () => {
            const dsl = {
                where: {
                    field: 'status',
                    operator: 'eq',
                    value: 'ACTIVE',
                },
            };
            const result = (0, creditFilterService_1.addCreditFilterToDSL)(dsl, {});
            expect(result.where).toEqual({
                and: [
                    { field: 'status', operator: 'eq', value: 'ACTIVE' },
                    { field: 'user.creditScore.score', operator: 'gte', value: 0 },
                ],
            });
        });
    });
    describe('CREDIT_LEVEL_THRESHOLDS', () => {
        it('should have correct thresholds for all levels', () => {
            expect(shared_1.CREDIT_LEVEL_THRESHOLDS.excellent).toEqual({ min: 900, max: 1000 });
            expect(shared_1.CREDIT_LEVEL_THRESHOLDS.good).toEqual({ min: 750, max: 899 });
            expect(shared_1.CREDIT_LEVEL_THRESHOLDS.general).toEqual({ min: 600, max: 749 });
            expect(shared_1.CREDIT_LEVEL_THRESHOLDS.poor).toEqual({ min: 0, max: 599 });
        });
    });
});
//# sourceMappingURL=creditFilterService.test.js.map