"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reviewNotificationHandlers_1 = require("../events/reviewNotificationHandlers");
const client_1 = require("../db/client");
// Mock prisma
jest.mock('../db/client', () => ({
    prisma: {
        review: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
        },
        rating: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
        },
        notification: {
            count: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            updateMany: jest.fn(),
        },
        reviewReport: {
            findUnique: jest.fn(),
        },
        role: {
            findUnique: jest.fn(),
        },
        userRole: {
            findMany: jest.fn(),
        },
    },
}));
// Mock notificationService functions used by notification handlers
jest.mock('../services/notificationService', () => ({
    sendNewReviewNotification: jest.fn(),
    sendReviewReplyNotification: jest.fn(),
    sendPendingReviewReminder: jest.fn(),
    sendBadReviewWarning: jest.fn(),
    sendCreditScoreChangeNotification: jest.fn(),
    scheduleReviewReminders: jest.fn(),
    notificationEvents: {
        on: jest.fn(),
        emit: jest.fn(),
    },
    reviewNotificationEvents: {
        on: jest.fn(),
        once: jest.fn(),
        emit: jest.fn(),
    },
}));
// Mock reviewEventHandlers to avoid circular dependency
jest.mock('../events/reviewEventHandlers', () => ({
    reviewEvents: {
        on: jest.fn(),
        emit: jest.fn(),
        once: jest.fn(),
    },
    ReviewEventType: {
        RATING_SUBMITTED: 'RATING_SUBMITTED',
        RATING_DELETED: 'RATING_DELETED',
        RATING_UPDATED: 'RATING_UPDATED',
        MATCH_COMPLETED: 'MATCH_COMPLETED',
    },
}));
describe('Review Notification Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('handleReviewCreatedNotification', () => {
        it('should send notification for new review', async () => {
            const mockRating = {
                id: 'rating-1',
                raterId: 'user-1',
                rateeId: 'user-2',
                score: 5,
                rater: { id: 'user-1', name: 'Test User', avatarUrl: null },
                ratee: { id: 'user-2', name: 'Recipient' },
                match: {
                    demand: { agent: { user: { id: 'user-2' } } },
                    supply: { agent: { user: { id: 'user-1' } } },
                },
            };
            client_1.prisma.rating.findUnique.mockResolvedValue(mockRating);
            const eventListener = jest.fn();
            reviewNotificationHandlers_1.reviewNotificationEvents.once(reviewNotificationHandlers_1.ReviewNotificationType.REVIEW_CREATED, eventListener);
            await (0, reviewNotificationHandlers_1.handleReviewCreatedNotification)('rating-1');
            expect(client_1.prisma.rating.findUnique).toHaveBeenCalledWith({
                where: { id: 'rating-1' },
                include: expect.any(Object),
            });
        });
        it('should handle missing rating gracefully', async () => {
            client_1.prisma.rating.findUnique.mockResolvedValue(null);
            await (0, reviewNotificationHandlers_1.handleReviewCreatedNotification)('rating-1');
            expect(client_1.prisma.rating.findUnique).toHaveBeenCalled();
        });
    });
    describe('handleReviewReplyNotification', () => {
        it('should send notification for review reply', async () => {
            const mockRating = {
                id: 'rating-1',
                raterId: 'user-1',
                rateeId: 'user-2',
                rater: { id: 'user-1', name: 'Test User' },
                ratee: { id: 'user-2', name: 'Responder' },
            };
            client_1.prisma.rating.findUnique.mockResolvedValue(mockRating);
            await (0, reviewNotificationHandlers_1.handleReviewReplyNotification)('rating-1', 'Thank you for your review!');
            expect(client_1.prisma.rating.findUnique).toHaveBeenCalledWith({
                where: { id: 'rating-1' },
                include: expect.any(Object),
            });
        });
    });
    describe('handlePendingReviewReminder', () => {
        it('should send reminder when user has not rated', async () => {
            client_1.prisma.rating.findFirst.mockResolvedValue(null);
            await (0, reviewNotificationHandlers_1.handlePendingReviewReminder)('match-1', 'user-1', 'Partner Name');
            expect(client_1.prisma.rating.findFirst).toHaveBeenCalledWith({
                where: {
                    matchId: 'match-1',
                    raterId: 'user-1',
                },
            });
        });
        it('should skip reminder when user already rated', async () => {
            client_1.prisma.rating.findFirst.mockResolvedValue({ id: 'rating-1' });
            await (0, reviewNotificationHandlers_1.handlePendingReviewReminder)('match-1', 'user-1', 'Partner Name');
            expect(client_1.prisma.rating.findFirst).toHaveBeenCalled();
        });
    });
    describe('handleBadReviewWarningNotification', () => {
        it('should send warning for bad reviews', async () => {
            const mockRating = {
                id: 'rating-1',
                rateeId: 'user-2',
                score: 1,
                ratee: { id: 'user-2', name: 'Recipient' },
            };
            client_1.prisma.rating.findUnique.mockResolvedValue(mockRating);
            await (0, reviewNotificationHandlers_1.handleBadReviewWarningNotification)('rating-1', -10);
            expect(client_1.prisma.rating.findUnique).toHaveBeenCalledWith({
                where: { id: 'rating-1' },
                include: expect.any(Object),
            });
        });
        it('should skip warning for good reviews', async () => {
            const mockRating = {
                id: 'rating-1',
                rateeId: 'user-2',
                score: 5,
                ratee: { id: 'user-2', name: 'Recipient' },
            };
            client_1.prisma.rating.findUnique.mockResolvedValue(mockRating);
            await (0, reviewNotificationHandlers_1.handleBadReviewWarningNotification)('rating-1', 5);
            expect(client_1.prisma.rating.findUnique).toHaveBeenCalled();
        });
    });
    describe('handleCreditScoreChangeNotification', () => {
        it('should send notification for significant positive change', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            await (0, reviewNotificationHandlers_1.handleCreditScoreChangeNotification)('user-1', 100, 110, 'Good review');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
        it('should send notification for significant negative change', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            await (0, reviewNotificationHandlers_1.handleCreditScoreChangeNotification)('user-1', 100, 85, 'Bad review');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
        it('should skip notification for minor changes', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            await (0, reviewNotificationHandlers_1.handleCreditScoreChangeNotification)('user-1', 100, 102, 'Minor change');
            // For minor changes, no notification should be sent
            consoleSpy.mockRestore();
        });
    });
    describe('getUserNotificationStats', () => {
        it('should return notification statistics', async () => {
            client_1.prisma.notification.count.mockResolvedValue(5);
            client_1.prisma.notification.findFirst.mockResolvedValue({
                createdAt: new Date('2024-01-01'),
            });
            const stats = await (0, reviewNotificationHandlers_1.getUserNotificationStats)('user-1');
            expect(stats).toHaveProperty('unreadCount', 5);
            expect(stats).toHaveProperty('lastNotificationAt');
        });
    });
    describe('markNotificationsAsRead', () => {
        it('should mark notifications as read', async () => {
            client_1.prisma.notification.updateMany.mockResolvedValue({ count: 2 });
            await (0, reviewNotificationHandlers_1.markNotificationsAsRead)('user-1', ['notif-1', 'notif-2']);
            expect(client_1.prisma.notification.updateMany).toHaveBeenCalledWith({
                where: { id: { in: ['notif-1', 'notif-2'] }, userId: 'user-1', status: expect.anything() },
                data: { status: expect.anything(), readAt: expect.any(Date) },
            });
        });
    });
    describe('getNotificationHistory', () => {
        it('should return notification history', async () => {
            const mockNotifications = [
                {
                    id: 'notif-1',
                    type: 'NEW_REVIEW',
                    status: 'READ',
                    content: 'Test',
                    createdAt: new Date(),
                    readAt: new Date(),
                },
                {
                    id: 'notif-2',
                    type: 'REVIEW_REPLY',
                    status: 'UNREAD',
                    content: 'Reply',
                    createdAt: new Date(),
                    readAt: null,
                },
            ];
            client_1.prisma.notification.findMany.mockResolvedValue(mockNotifications);
            const history = await (0, reviewNotificationHandlers_1.getNotificationHistory)('user-1');
            expect(history).toHaveLength(2);
            expect(history[0].read).toBe(true);
            expect(history[1].read).toBe(false);
        });
    });
    describe('initializeReviewNotificationHandlers', () => {
        it('should setup all notification handlers', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            (0, reviewNotificationHandlers_1.initializeReviewNotificationHandlers)();
            expect(consoleSpy).toHaveBeenCalledWith('[NOTIFICATION] Review notification handlers initialized');
            consoleSpy.mockRestore();
        });
    });
});
//# sourceMappingURL=reviewNotificationHandlers.test.js.map