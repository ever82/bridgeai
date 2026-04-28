"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock dependencies
jest.mock('../db/client', () => ({
    prisma: {
        match: {
            count: jest.fn(),
            findMany: jest.fn(),
            aggregate: jest.fn(),
        },
        creditScore: {
            findUnique: jest.fn(),
        },
    },
}));
jest.mock('../cache', () => ({
    cacheGet: jest.fn(),
    cacheSet: jest.fn(),
    invalidateMatchResults: jest.fn(),
}));
const optimizedMatchingService_1 = require("../services/matching/optimizedMatchingService");
const client_1 = require("../db/client");
const cache_1 = require("../cache");
describe('OptimizedMatchingService', () => {
    let service;
    beforeEach(() => {
        service = new optimizedMatchingService_1.OptimizedMatchingService();
        jest.clearAllMocks();
        cache_1.cacheGet.mockResolvedValue(null);
    });
    describe('findMatches', () => {
        it('should fetch from database', async () => {
            const mockMatches = [
                {
                    id: '1',
                    demandId: 'd1',
                    supplyId: 's1',
                    score: 0.85,
                    status: 'PENDING',
                    createdAt: new Date(),
                    demand: {
                        agent: {
                            user: {
                                creditScores: [{ score: 750, level: 'good' }],
                            },
                        },
                    },
                    supply: {
                        agent: {
                            user: {
                                creditScores: [{ score: 800, level: 'excellent' }],
                            },
                        },
                    },
                },
            ];
            client_1.prisma.match.findMany.mockResolvedValue(mockMatches);
            const result = await service.findMatches({
                demandId: 'd1',
                minScore: 600,
            });
            expect(client_1.prisma.match.findMany).toHaveBeenCalled();
            expect(result.matches).toBeDefined();
        });
        it('should apply credit score filtering when minScore is set', async () => {
            const mockMatches = [
                {
                    id: '1',
                    demandId: 'd1',
                    supplyId: 's1',
                    score: 0.85,
                    status: 'PENDING',
                    createdAt: new Date(),
                    demand: {
                        agent: {
                            user: {
                                creditScores: [{ score: 500, level: 'low' }],
                            },
                        },
                    },
                    supply: {
                        agent: {
                            user: {
                                creditScores: [{ score: 800, level: 'excellent' }],
                            },
                        },
                    },
                },
                {
                    id: '2',
                    demandId: 'd1',
                    supplyId: 's2',
                    score: 0.9,
                    status: 'PENDING',
                    createdAt: new Date(),
                    demand: {
                        agent: {
                            user: {
                                creditScores: [{ score: 750, level: 'good' }],
                            },
                        },
                    },
                    supply: {
                        agent: {
                            user: {
                                creditScores: [{ score: 850, level: 'excellent' }],
                            },
                        },
                    },
                },
            ];
            client_1.prisma.match.findMany.mockResolvedValue(mockMatches);
            const result = await service.findMatches({
                demandId: 'd1',
                minScore: 600,
            });
            // First match should be filtered out (min credit 500 < 600)
            expect(result.matches).toHaveLength(1);
            expect(result.matches[0].matchId).toBe('2');
        });
        it('should apply credit weight to final score', async () => {
            const mockMatches = [
                {
                    id: '1',
                    demandId: 'd1',
                    supplyId: 's1',
                    score: 0.8,
                    status: 'PENDING',
                    createdAt: new Date(),
                    demand: {
                        agent: {
                            user: {
                                creditScores: [{ score: 700, level: 'good' }],
                            },
                        },
                    },
                    supply: {
                        agent: {
                            user: {
                                creditScores: [{ score: 700, level: 'good' }],
                            },
                        },
                    },
                },
            ];
            client_1.prisma.match.findMany.mockResolvedValue(mockMatches);
            const result = await service.findMatches({
                demandId: 'd1',
                creditWeight: 0.5,
            });
            // Score calculation:
            // baseMatchScore = 0.8
            // avgCredit = (700 + 700) / 2 = 700
            // normalizedCredit = 700 / 1000 = 0.7
            // weightedScore = 0.8 * (1 - 0.5) + 0.7 * 100 * 0.5 = 0.4 + 35 = 35.4
            expect(result.matches[0].score).toBeGreaterThan(0.8);
        });
        it('should respect limit and offset parameters', async () => {
            client_1.prisma.match.findMany.mockResolvedValue([]);
            await service.findMatches({
                demandId: 'd1',
                limit: 5,
                offset: 10,
            });
            const callArgs = client_1.prisma.match.findMany.mock.calls[0][0];
            expect(callArgs.take).toBe(15); // limit * 3 for buffer
            expect(callArgs.skip).toBe(10);
        });
        it('should sort results by weighted score descending', async () => {
            const mockMatches = [
                {
                    id: '1',
                    demandId: 'd1',
                    supplyId: 's1',
                    score: 0.9,
                    status: 'PENDING',
                    createdAt: new Date(),
                    demand: { agent: { user: { creditScores: [{ score: 600 }] } } },
                    supply: { agent: { user: { creditScores: [{ score: 600 }] } } },
                },
                {
                    id: '2',
                    demandId: 'd1',
                    supplyId: 's2',
                    score: 0.5,
                    status: 'PENDING',
                    createdAt: new Date(),
                    demand: { agent: { user: { creditScores: [{ score: 900 }] } } },
                    supply: { agent: { user: { creditScores: [{ score: 900 }] } } },
                },
            ];
            client_1.prisma.match.findMany.mockResolvedValue(mockMatches);
            const result = await service.findMatches({ demandId: 'd1' });
            // Second match has higher credit score, should be first after weighting
            expect(result.matches[0].matchId).toBe('2');
        });
        it('should exclude low credit when flag is set', async () => {
            const mockMatches = [
                {
                    id: '1',
                    demandId: 'd1',
                    supplyId: 's1',
                    score: 0.9,
                    status: 'PENDING',
                    createdAt: new Date(),
                    demand: { agent: { user: { creditScores: [{ score: 500 }] } } },
                    supply: { agent: { user: { creditScores: [{ score: 500 }] } } },
                },
                {
                    id: '2',
                    demandId: 'd1',
                    supplyId: 's2',
                    score: 0.8,
                    status: 'PENDING',
                    createdAt: new Date(),
                    demand: { agent: { user: { creditScores: [{ score: 700 }] } } },
                    supply: { agent: { user: { creditScores: [{ score: 700 }] } } },
                },
            ];
            client_1.prisma.match.findMany.mockResolvedValue(mockMatches);
            const result = await service.findMatches({
                demandId: 'd1',
                excludeLowCredit: true,
            });
            // First match should be filtered out (min credit 500 < 600)
            expect(result.matches).toHaveLength(1);
            expect(result.matches[0].matchId).toBe('2');
        });
    });
    describe('checkCreditRequirement', () => {
        it('should return eligible true when score meets minimum', async () => {
            client_1.prisma.creditScore.findUnique.mockResolvedValue({
                score: 750,
                level: 'good',
            });
            const result = await service.checkCreditRequirement('user1', 600);
            expect(result.eligible).toBe(true);
            expect(result.score).toBe(750);
            expect(result.level).toBe('good');
        });
        it('should return eligible false when score below minimum', async () => {
            client_1.prisma.creditScore.findUnique.mockResolvedValue({
                score: 550,
                level: 'low',
            });
            const result = await service.checkCreditRequirement('user1', 600);
            expect(result.eligible).toBe(false);
            expect(result.score).toBe(550);
        });
        it('should handle missing credit score', async () => {
            client_1.prisma.creditScore.findUnique.mockResolvedValue(null);
            const result = await service.checkCreditRequirement('user1', 600);
            expect(result.eligible).toBe(false);
            expect(result.score).toBe(0);
            expect(result.level).toBe('unknown');
        });
    });
    describe('getMatchStats', () => {
        it('should return aggregated statistics', async () => {
            client_1.prisma.match.count
                .mockResolvedValueOnce(100) // total
                .mockResolvedValueOnce(30) // pending
                .mockResolvedValueOnce(50); // accepted
            client_1.prisma.match.aggregate.mockResolvedValue({
                _avg: { score: 0.75 },
            });
            const result = await service.getMatchStats();
            expect(result.totalMatches).toBe(100);
            expect(result.pendingMatches).toBe(30);
            expect(result.acceptedMatches).toBe(50);
            expect(result.avgScore).toBe(0.75);
        });
    });
});
//# sourceMappingURL=optimizedMatchingService.test.js.map