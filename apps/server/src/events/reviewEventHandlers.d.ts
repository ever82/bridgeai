import { EventEmitter } from 'events';
export declare enum ReviewEventType {
    RATING_SUBMITTED = "RATING_SUBMITTED",
    RATING_DELETED = "RATING_DELETED",
    RATING_UPDATED = "RATING_UPDATED",
    MATCH_COMPLETED = "MATCH_COMPLETED"
}
export interface RatingSubmittedPayload {
    ratingId: string;
    matchId: string;
    raterId: string;
    rateeId: string;
    score: number;
    comment?: string;
}
export interface RatingDeletedPayload {
    ratingId: string;
    matchId: string;
    raterId: string;
    rateeId: string;
    score: number;
}
export interface RatingUpdatedPayload {
    ratingId: string;
    matchId: string;
    raterId: string;
    rateeId: string;
    oldScore: number;
    newScore: number;
    comment?: string;
}
export interface MatchCompletedPayload {
    matchId: string;
    completedAt: Date;
}
export declare const reviewEvents: EventEmitter<[never]>;
/**
 * Handle rating submitted event
 * Updates credit score and sends notifications
 * @param payload - Rating submitted payload
 */
export declare function handleRatingSubmitted(payload: RatingSubmittedPayload): Promise<void>;
/**
 * Handle rating deleted event
 * Recalculates credit score
 * @param payload - Rating deleted payload
 */
export declare function handleRatingDeleted(payload: RatingDeletedPayload): Promise<void>;
/**
 * Handle rating updated event
 * Adjusts credit score based on score change
 * @param payload - Rating updated payload
 */
export declare function handleRatingUpdated(payload: RatingUpdatedPayload): Promise<void>;
/**
 * Handle match completed event
 * Schedules review reminders
 * @param payload - Match completed payload
 */
export declare function handleMatchCompleted(payload: MatchCompletedPayload): Promise<void>;
/**
 * Setup credit score event listeners
 * Listens to events from creditScoreService
 */
export declare function setupCreditScoreListeners(): void;
/**
 * Initialize all review event handlers
 * Sets up event listeners and handlers
 */
export declare function initializeReviewEventHandlers(): void;
/**
 * Trigger rating submitted event programmatically
 * @param payload - Rating submitted payload
 */
export declare function triggerRatingSubmitted(payload: RatingSubmittedPayload): Promise<void>;
/**
 * Trigger rating deleted event programmatically
 * @param payload - Rating deleted payload
 */
export declare function triggerRatingDeleted(payload: RatingDeletedPayload): Promise<void>;
/**
 * Trigger rating updated event programmatically
 * @param payload - Rating updated payload
 */
export declare function triggerRatingUpdated(payload: RatingUpdatedPayload): Promise<void>;
/**
 * Trigger match completed event programmatically
 * @param payload - Match completed payload
 */
export declare function triggerMatchCompleted(payload: MatchCompletedPayload): Promise<void>;
//# sourceMappingURL=reviewEventHandlers.d.ts.map