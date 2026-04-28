import { NotificationType } from '@prisma/client';
export { reviewNotificationEvents } from '../services/notificationService';
export declare enum ReviewNotificationType {
    REVIEW_CREATED = "REVIEW_CREATED",
    REVIEW_REPLIED = "REVIEW_REPLIED",
    REVIEW_REMINDER = "REVIEW_REMINDER",
    REVIEW_REPORTED = "REVIEW_REPORTED",
    CREDIT_SCORE_UPDATED = "CREDIT_SCORE_UPDATED"
}
/**
 * Handle new review created notification
 * Sends notification to the review recipient
 * @param ratingId - Rating ID
 */
export declare function handleReviewCreatedNotification(ratingId: string): Promise<void>;
/**
 * Handle review reply notification
 * Sends notification to the original reviewer
 * @param ratingId - Rating ID
 * @param replyContent - Reply content
 */
export declare function handleReviewReplyNotification(ratingId: string, replyContent: string): Promise<void>;
/**
 * Handle pending review reminder notification
 * Sends reminder to users who haven't reviewed after match completion
 * @param matchId - Match ID
 * @param userId - User ID to remind
 * @param partnerName - Partner's name for context
 */
export declare function handlePendingReviewReminder(matchId: string, userId: string, partnerName: string): Promise<void>;
/**
 * Handle bad review warning notification
 * Sends warning when user receives a bad review
 * @param ratingId - Rating ID
 * @param creditDelta - Credit score change
 */
export declare function handleBadReviewWarningNotification(ratingId: string, creditDelta: number): Promise<void>;
/**
 * Handle credit score change notification
 * Sends notification when credit score changes significantly
 * @param userId - User ID
 * @param previousScore - Previous credit score
 * @param newScore - New credit score
 * @param reason - Reason for change
 */
export declare function handleCreditScoreChangeNotification(userId: string, previousScore: number, newScore: number, reason: string): Promise<void>;
/**
 * Handle review reported notification
 * Sends notification to admins and the reported user
 * @param reportId - Report ID
 */
export declare function handleReviewReportedNotification(reportId: string): Promise<void>;
/**
 * Setup notification event listeners
 * Listens to events from notification service
 */
export declare function setupNotificationListeners(): void;
/**
 * Setup review event listeners for notifications
 * Listens to review events and triggers notifications
 */
export declare function setupReviewEventListeners(): void;
/**
 * Initialize all review notification handlers
 * Sets up event listeners and handlers
 */
export declare function initializeReviewNotificationHandlers(): void;
/**
 * Get notification statistics for a user
 * @param userId - User ID
 * @returns Notification statistics
 */
export declare function getUserNotificationStats(userId: string): Promise<{
    unreadCount: number;
    lastNotificationAt: Date | null;
}>;
/**
 * Mark notifications as read for a user
 * @param userId - User ID
 * @param notificationIds - Notification IDs to mark as read
 */
export declare function markNotificationsAsRead(userId: string, notificationIds: string[]): Promise<void>;
/**
 * Get notification history for a user
 * @param userId - User ID
 * @param limit - Number of notifications to return
 * @param offset - Offset for pagination
 * @returns Notification history
 */
export declare function getNotificationHistory(userId: string, limit?: number, offset?: number): Promise<Array<{
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    read: boolean;
    createdAt: Date;
}>>;
//# sourceMappingURL=reviewNotificationHandlers.d.ts.map