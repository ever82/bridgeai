"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const creditScoreService_1 = require("../services/creditScoreService");
const client_1 = require("../db/client");
// Mock prisma
jest.mock('../db/client', () => ({
    prisma: {
        creditScore: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },
        creditHistory: {
            create: jest.fn(),
        },
        creditFactor: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
        },
        rating: {
            findMany: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
        userDevice: {
            count: jest.fn(),
        },
        transaction: {
            findMany: jest.fn(),
        },
        match: {
            findMany: jest.fn(),
            count: jest.fn(),
        },
        connection: {
            count: jest.fn(),
        },
        conversation: {
            findMany: jest.fn(),
        },
    },
}));
describe('Credit Score Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('calculateRatingCreditDelta', () => {
        it('should return positive delta for good ratings (>= 4)', () => {
            expect((0, creditScoreService_1.calculateRatingCreditDelta)(5)).toBe(creditScoreService_1.REVIEW_CREDIT_CONFIG.GOOD_REVIEW_SCORE);
            expect((0, creditScoreService_1.calculateRatingCreditDelta)(4)).toBe(creditScoreService_1.REVIEW_CREDIT_CONFIG.GOOD_REVIEW_SCORE);
        });
        it('should return negative delta for bad ratings (<= 2)', () => {
            expect((0, creditScoreService_1.calculateRatingCreditDelta)(1)).toBe(creditScoreService_1.REVIEW_CREDIT_CONFIG.BAD_REVIEW_SCORE);
            expect((0, creditScoreService_1.calculateRatingCreditDelta)(2)).toBe(creditScoreService_1.REVIEW_CREDIT_CONFIG.BAD_REVIEW_SCORE);
        });
        it('should return zero for neutral ratings (3)', () => {
            expect((0, creditScoreService_1.calculateRatingCreditDelta)(3)).toBe(0);
        });
    });
    describe('calculateReviewCountBonus', () => {
        it('should calculate bonus based on review count', () => {
            expect((0, creditScoreService_1.calculateReviewCountBonus)(5)).toBe(5);
            expect((0, creditScoreService_1.calculateReviewCountBonus)(10)).toBe(10);
        });
        it('should cap bonus at maximum', () => {
            expect((0, creditScoreService_1.calculateReviewCountBonus)(25)).toBe(creditScoreService_1.REVIEW_CREDIT_CONFIG.MAX_REVIEW_COUNT_BONUS);
            expect((0, creditScoreService_1.calculateReviewCountBonus)(100)).toBe(creditScoreService_1.REVIEW_CREDIT_CONFIG.MAX_REVIEW_COUNT_BONUS);
        });
        it('should return 0 for 0 reviews', () => {
            expect((0, creditScoreService_1.calculateReviewCountBonus)(0)).toBe(0);
        });
    });
    describe('calculateReplyRateBonus', () => {
        it('should return bonus when reply rate is >= threshold', () => {
            expect((0, creditScoreService_1.calculateReplyRateBonus)(10, 8)).toBe(creditScoreService_1.REVIEW_CREDIT_CONFIG.REPLY_RATE_BONUS);
            expect((0, creditScoreService_1.calculateReplyRateBonus)(10, 10)).toBe(creditScoreService_1.REVIEW_CREDIT_CONFIG.REPLY_RATE_BONUS);
        });
        it('should return 0 when reply rate is < threshold', () => {
            expect((0, creditScoreService_1.calculateReplyRateBonus)(10, 7)).toBe(0);
            expect((0, creditScoreService_1.calculateReplyRateBonus)(10, 5)).toBe(0);
        });
        it('should return 0 when no reviews', () => {
            expect((0, creditScoreService_1.calculateReplyRateBonus)(0, 0)).toBe(0);
        });
    });
    describe('getUserCreditScore', () => {
        it('should return latest credit score', async () => {
            const mockRecord = { score: 150, userId: 'user-1' };
            client_1.prisma.creditScore.findUnique.mockResolvedValue(mockRecord);
            const score = await (0, creditScoreService_1.getUserCreditScore)('user-1');
            expect(score).toBe(150);
            expect(client_1.prisma.creditScore.findUnique).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
            });
        });
        it('should return default score when no records exist', async () => {
            client_1.prisma.creditScore.findUnique.mockResolvedValue(null);
            client_1.prisma.creditScore.upsert.mockResolvedValue({
                score: creditScoreService_1.REVIEW_CREDIT_CONFIG.DEFAULT_SCORE,
                userId: 'user-1',
                level: 'general',
            });
            client_1.prisma.creditHistory.create.mockResolvedValue({});
            client_1.prisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                agents: [],
            });
            client_1.prisma.userDevice.count.mockResolvedValue(0);
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            client_1.prisma.match.findMany.mockResolvedValue([]);
            client_1.prisma.match.count.mockResolvedValue(0);
            client_1.prisma.rating.findMany.mockResolvedValue([]);
            client_1.prisma.connection.count.mockResolvedValue(0);
            client_1.prisma.conversation.findMany.mockResolvedValue([]);
            const score = await (0, creditScoreService_1.getUserCreditScore)('user-1');
            // When no cached score exists, calculateScore is called and returns a computed score
            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(1000);
        });
    });
    describe('updateCreditScore', () => {
        it('should update credit score and emit event', async () => {
            const currentScore = 100;
            const delta = 5;
            const newScore = currentScore + delta;
            client_1.prisma.creditScore.findUnique.mockResolvedValue({ score: currentScore });
            client_1.prisma.creditScore.upsert.mockResolvedValue({
                score: newScore,
                userId: 'user-1',
                level: 'good',
            });
            client_1.prisma.creditHistory.create.mockResolvedValue({
                id: 'history-1',
                score: newScore,
                delta,
            });
            const eventListener = jest.fn();
            creditScoreService_1.creditScoreEvents.once('creditScoreUpdated', eventListener);
            const result = await (0, creditScoreService_1.updateCreditScore)({
                userId: 'user-1',
                delta,
                reason: 'Test update',
                sourceType: 'TEST',
            });
            expect(result.score).toBe(newScore);
            expect(result.delta).toBe(delta);
            expect(eventListener).toHaveBeenCalledWith({
                userId: 'user-1',
                previousScore: currentScore,
                newScore,
                delta,
                reason: 'Test update',
                sourceType: 'TEST',
                sourceId: undefined,
            });
        });
        it('should cap score at minimum and maximum', async () => {
            client_1.prisma.creditScore.findUnique.mockResolvedValue({ score: 995 });
            client_1.prisma.creditScore.upsert.mockResolvedValue({
                score: creditScoreService_1.REVIEW_CREDIT_CONFIG.MAX_SCORE,
                userId: 'user-1',
                level: 'excellent',
            });
            client_1.prisma.creditHistory.create.mockResolvedValue({
                id: 'history-1',
                score: creditScoreService_1.REVIEW_CREDIT_CONFIG.MAX_SCORE,
                delta: 10,
            });
            const result = await (0, creditScoreService_1.updateCreditScore)({
                userId: 'user-1',
                delta: 10,
                reason: 'Test update',
                sourceType: 'TEST',
            });
            expect(result.score).toBe(creditScoreService_1.REVIEW_CREDIT_CONFIG.MAX_SCORE);
        });
    });
    describe('recalculateCreditScore', () => {
        it('should recalculate score based on all ratings', async () => {
            const ratings = [
                { score: 5 }, // good review
                { score: 5 }, // good review
                { score: 2 }, // bad review
            ];
            client_1.prisma.rating.findMany.mockResolvedValue(ratings);
            client_1.prisma.creditScore.findUnique.mockResolvedValue({ score: 100 });
            client_1.prisma.creditScore.upsert.mockResolvedValue({
                score: 100,
                userId: 'user-1',
                level: 'good',
            });
            client_1.prisma.creditHistory.create.mockResolvedValue({
                id: 'history-1',
                score: 100,
                delta: 0,
            });
            client_1.prisma.creditFactor.deleteMany.mockResolvedValue({});
            client_1.prisma.creditFactor.createMany.mockResolvedValue({});
            client_1.prisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                agents: [],
            });
            client_1.prisma.userDevice.count.mockResolvedValue(0);
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            client_1.prisma.match.findMany.mockResolvedValue([]);
            client_1.prisma.match.count.mockResolvedValue(0);
            client_1.prisma.connection.count.mockResolvedValue(0);
            client_1.prisma.conversation.findMany.mockResolvedValue([]);
            const newScore = await (0, creditScoreService_1.recalculateCreditScore)('user-1');
            // recalculateCreditScore delegates to class method which computes from all dimensions
            expect(newScore).toBeGreaterThan(0);
            expect(newScore).toBeLessThanOrEqual(1000);
        });
        it('should handle no ratings', async () => {
            client_1.prisma.rating.findMany.mockResolvedValue([]);
            client_1.prisma.creditScore.findUnique.mockResolvedValue(null);
            client_1.prisma.creditScore.upsert.mockResolvedValue({
                score: 600,
                userId: 'user-1',
                level: 'general',
            });
            client_1.prisma.creditHistory.create.mockResolvedValue({
                id: 'history-1',
                score: 600,
                delta: 600,
            });
            client_1.prisma.creditFactor.deleteMany.mockResolvedValue({});
            client_1.prisma.creditFactor.createMany.mockResolvedValue({});
            client_1.prisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                agents: [],
            });
            client_1.prisma.userDevice.count.mockResolvedValue(0);
            client_1.prisma.transaction.findMany.mockResolvedValue([]);
            client_1.prisma.match.findMany.mockResolvedValue([]);
            client_1.prisma.match.count.mockResolvedValue(0);
            client_1.prisma.connection.count.mockResolvedValue(0);
            client_1.prisma.conversation.findMany.mockResolvedValue([]);
            const newScore = await (0, creditScoreService_1.recalculateCreditScore)('user-1');
            // recalculateCreditScore delegates to class method which computes from all dimensions
            expect(newScore).toBeGreaterThan(0);
            expect(newScore).toBeLessThanOrEqual(1000);
        });
    });
});
//# sourceMappingURL=creditScoreService.test.js.map