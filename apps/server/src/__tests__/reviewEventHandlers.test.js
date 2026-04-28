"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reviewEventHandlers_1 = require("../events/reviewEventHandlers");
const creditScoreService_1 = require("../services/creditScoreService");
const client_1 = require("../db/client");
const notificationService_1 = require("../services/notificationService");
// Mock prisma and services
jest.mock('../db/client', () => ({
    prisma: {
        rating: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
        creditRecord: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        match: {
            findUnique: jest.fn(),
        },
    },
}));
jest.mock('../services/creditScoreService', () => {
    const actual = jest.requireActual('../services/creditScoreService');
    return {
        ...actual,
        creditScoreService: {
            ...actual.creditScoreService,
            updateCreditScore: jest.fn().mockResolvedValue({ success: true, score: 100 }),
        },
        recalculateCreditScore: jest.fn(),
        calculateRatingCreditDelta: jest.fn(),
        creditScoreEvents: {
            on: jest.fn(),
            emit: jest.fn(),
        },
    };
});
// Mock notificationService
jest.mock('../services/notificationService', () => ({
    sendNewReviewNotification: jest.fn(),
    sendBadReviewWarning: jest.fn(),
    sendCreditScoreChangeNotification: jest.fn(),
    sendReviewReplyNotification: jest.fn(),
    sendPendingReviewReminder: jest.fn(),
    scheduleReviewReminders: jest.fn().mockResolvedValue(undefined),
    notificationEvents: {
        on: jest.fn(),
        emit: jest.fn(),
    },
    reviewNotificationEvents: {
        on: jest.fn(),
        emit: jest.fn(),
    },
    notificationService: {
        sendToUser: jest.fn(),
    },
}));
describe('Review Event Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('handleRatingSubmitted', () => {
        it('should handle good rating submission', async () => {
            const mockRater = { id: 'user-1', name: 'Test User' };
            client_1.prisma.user.findUnique.mockResolvedValue(mockRater);
            creditScoreService_1.creditScoreService.updateCreditScore.mockResolvedValue({
                success: true,
                score: 100,
            });
            const eventListener = jest.fn();
            reviewEventHandlers_1.reviewEvents.once(reviewEventHandlers_1.ReviewEventType.RATING_SUBMITTED, eventListener);
            await (0, reviewEventHandlers_1.handleRatingSubmitted)({
                ratingId: 'rating-1',
                matchId: 'match-1',
                raterId: 'user-1',
                rateeId: 'user-2',
                score: 5,
            });
            expect(creditScoreService_1.creditScoreService.updateCreditScore).toHaveBeenCalledWith('user-2', 'RATING', 'rating-1');
        });
        it('should handle bad rating submission with warning', async () => {
            const mockRater = { id: 'user-1', name: 'Test User' };
            client_1.prisma.user.findUnique.mockResolvedValue(mockRater);
            creditScoreService_1.creditScoreService.updateCreditScore.mockResolvedValue({
                success: true,
                score: 100,
            });
            await (0, reviewEventHandlers_1.handleRatingSubmitted)({
                ratingId: 'rating-1',
                matchId: 'match-1',
                raterId: 'user-1',
                rateeId: 'user-2',
                score: 1,
            });
            expect(creditScoreService_1.creditScoreService.updateCreditScore).toHaveBeenCalledWith('user-2', 'RATING', 'rating-1');
        });
        it('should handle missing rater gracefully', async () => {
            client_1.prisma.user.findUnique.mockResolvedValue(null);
            creditScoreService_1.creditScoreService.updateCreditScore.mockResolvedValue({
                success: true,
                score: 100,
            });
            // Should not throw, just use anonymous name
            await (0, reviewEventHandlers_1.handleRatingSubmitted)({
                ratingId: 'rating-1',
                matchId: 'match-1',
                raterId: 'user-1',
                rateeId: 'user-2',
                score: 5,
            });
            expect(creditScoreService_1.creditScoreService.updateCreditScore).toHaveBeenCalledWith('user-2', 'RATING', 'rating-1');
        });
    });
    describe('handleRatingDeleted', () => {
        it('should recalculate credit score after deletion', async () => {
            creditScoreService_1.recalculateCreditScore.mockResolvedValue(100);
            const eventListener = jest.fn();
            reviewEventHandlers_1.reviewEvents.once(reviewEventHandlers_1.ReviewEventType.RATING_DELETED, eventListener);
            await (0, reviewEventHandlers_1.handleRatingDeleted)({
                ratingId: 'rating-1',
                matchId: 'match-1',
                raterId: 'user-1',
                rateeId: 'user-2',
                score: 5,
            });
            expect(creditScoreService_1.recalculateCreditScore).toHaveBeenCalledWith('user-2');
        });
    });
    describe('handleRatingUpdated', () => {
        it('should adjust credit score when rating changes', async () => {
            creditScoreService_1.creditScoreService.updateCreditScore.mockResolvedValue({
                success: true,
                score: 100,
            });
            await (0, reviewEventHandlers_1.handleRatingUpdated)({
                ratingId: 'rating-1',
                matchId: 'match-1',
                raterId: 'user-1',
                rateeId: 'user-2',
                oldScore: 5,
                newScore: 1,
            });
            expect(creditScoreService_1.creditScoreService.updateCreditScore).toHaveBeenCalledWith('user-2', 'RATING_UPDATE', 'rating-1');
        });
        it('should not update when delta is zero', async () => {
            creditScoreService_1.calculateRatingCreditDelta.mockReturnValue(5);
            await (0, reviewEventHandlers_1.handleRatingUpdated)({
                ratingId: 'rating-1',
                matchId: 'match-1',
                raterId: 'user-1',
                rateeId: 'user-2',
                oldScore: 5,
                newScore: 4,
            });
            expect(creditScoreService_1.creditScoreService.updateCreditScore).not.toHaveBeenCalled();
        });
    });
    describe('handleMatchCompleted', () => {
        it('should schedule review reminders', async () => {
            const completedAt = new Date();
            const eventListener = jest.fn();
            reviewEventHandlers_1.reviewEvents.once(reviewEventHandlers_1.ReviewEventType.MATCH_COMPLETED, eventListener);
            await (0, reviewEventHandlers_1.handleMatchCompleted)({
                matchId: 'match-1',
                completedAt,
            });
            expect(notificationService_1.scheduleReviewReminders).toHaveBeenCalledWith('match-1', completedAt);
        });
    });
    describe('initializeReviewEventHandlers', () => {
        it('should setup all event listeners', () => {
            (0, reviewEventHandlers_1.initializeReviewEventHandlers)();
            expect(creditScoreService_1.creditScoreEvents.on).toHaveBeenCalledWith('creditScoreUpdated', expect.any(Function));
        });
    });
});
//# sourceMappingURL=reviewEventHandlers.test.js.map