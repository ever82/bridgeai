/**
 * Moderation Queue Service
 * 审核队列服务
 *
 * 管理内容举报的队列：review/message/user 举报的排队、人工审核、状态流转、AI预标记
 */
import { ModerationQueueItem, ModerationQueueStatus } from '@prisma/client';
export interface ICreateQueueItem {
    contentType: 'review' | 'message' | 'user';
    contentId: string;
    content?: string;
    reportedBy: string;
    reportReason?: string;
}
export interface IQueueFilters {
    contentType?: string;
    status?: ModerationQueueStatus;
    assignedTo?: string;
    page?: number;
    limit?: number;
}
export interface IQueueStats {
    pending: number;
    inProgress: number;
    resolved: number;
    escalated: number;
    total: number;
    avgWaitTimeMinutes: number;
    byContentType: {
        review: number;
        message: number;
        user: number;
    };
}
/**
 * Add item to moderation queue
 * @param item Queue item data
 * @returns Created queue item
 */
export declare function addToQueue(item: ICreateQueueItem): Promise<ModerationQueueItem>;
/**
 * Get queue items with filters and pagination
 * @param filters Filter and pagination options
 * @returns List of queue items with total count
 */
export declare function getQueue(filters?: IQueueFilters): Promise<{
    items: ModerationQueueItem[];
    total: number;
}>;
/**
 * Get single queue item by ID
 * @param id Queue item ID
 * @returns Queue item or null
 */
export declare function getItemById(id: string): Promise<ModerationQueueItem | null>;
/**
 * Assign queue item to a moderator
 * @param id Queue item ID
 * @param moderatorId Moderator user ID
 * @returns Updated queue item
 */
export declare function assignItem(id: string, moderatorId: string): Promise<ModerationQueueItem>;
/**
 * Resolve queue item with action
 * @param id Queue item ID
 * @param action Action taken: 'APPROVE' | 'HIDE' | 'WARN' | 'BAN'
 * @param note Optional moderator note
 * @param moderatorId Moderator user ID
 * @returns Updated queue item
 */
export declare function resolveItem(id: string, action: 'APPROVE' | 'HIDE' | 'WARN' | 'BAN', note?: string, moderatorId?: string): Promise<ModerationQueueItem>;
/**
 * Escalate queue item to higher-level moderator
 * @param id Queue item ID
 * @param note Escalation note
 * @param moderatorId Current moderator ID
 * @returns Updated queue item
 */
export declare function escalateItem(id: string, note?: string, moderatorId?: string): Promise<ModerationQueueItem>;
/**
 * Get queue statistics
 * @returns Queue statistics
 */
export declare function getStats(): Promise<IQueueStats>;
/**
 * Add review report to queue (integrates with reviewService.reportReview)
 * @param reviewId Review ID
 * @param reporterId Reporter user ID
 * @param reason Report reason
 * @param content Cached review content
 */
export declare function addReviewReportToQueue(reviewId: string, reporterId: string, reason: string, content?: string): Promise<ModerationQueueItem>;
/**
 * Add message report to queue
 * @param messageId Message ID
 * @param reporterId Reporter user ID
 * @param reason Report reason
 * @param content Cached message content
 */
export declare function addMessageReportToQueue(messageId: string, reporterId: string, reason: string, content?: string): Promise<ModerationQueueItem>;
/**
 * Add user report to queue
 * @param userId User ID
 * @param reporterId Reporter user ID
 * @param reason Report reason
 */
export declare function addUserReportToQueue(userId: string, reporterId: string, reason: string): Promise<ModerationQueueItem>;
/**
 * Claim next pending item for a moderator
 * Picks the highest-priority item (highest aiScore, oldest first as tiebreaker)
 * and assigns it to the requesting moderator.
 * @param moderatorId Moderator user ID
 * @param contentType Optional content type filter
 * @returns Claimed queue item or null if queue empty
 */
export declare function claimNext(moderatorId: string, contentType?: string): Promise<ModerationQueueItem | null>;
/**
 * Reopen a resolved queue item
 * Returns the item to PENDING status for re-review
 * @param id Queue item ID
 * @param note Reopen reason
 * @param moderatorId Moderator who reopens
 * @returns Updated queue item
 */
export declare function reopenItem(id: string, note?: string, moderatorId?: string): Promise<ModerationQueueItem>;
/**
 * Batch resolve multiple queue items with the same action
 * @param ids Queue item IDs
 * @param action Resolution action
 * @param note Optional note applied to all
 * @param moderatorId Moderator user ID
 * @returns Number of items resolved
 */
export declare function batchResolve(ids: string[], action: 'APPROVE' | 'HIDE' | 'WARN' | 'BAN', note?: string, moderatorId?: string): Promise<{
    resolved: number;
    failed: number;
}>;
//# sourceMappingURL=moderationQueue.d.ts.map