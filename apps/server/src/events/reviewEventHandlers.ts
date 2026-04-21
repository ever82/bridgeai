import { EventEmitter } from 'events';

import { prisma } from '../db/client';
import {
  handleNewRating,
  creditScoreEvents,
  updateCreditScore,
  calculateRatingCreditDelta,
  recalculateCreditScore,
} from '../services/creditScoreService';
import {
  sendNewReviewNotification,
  sendBadReviewWarning,
  sendCreditScoreChangeNotification,
  scheduleReviewReminders,
} from '../services/notificationService';

// Review Event Types
export enum ReviewEventType {
  RATING_SUBMITTED = 'RATING_SUBMITTED',
  RATING_DELETED = 'RATING_DELETED',
  RATING_UPDATED = 'RATING_UPDATED',
  MATCH_COMPLETED = 'MATCH_COMPLETED',
}

// Review Event Payloads
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

// Review Events Emitter
export const reviewEvents = new EventEmitter();

/**
 * Handle rating submitted event
 * Updates credit score and sends notifications
 * @param payload - Rating submitted payload
 */
export async function handleRatingSubmitted(
  payload: RatingSubmittedPayload
): Promise<void> {
  const { ratingId, raterId, rateeId, score } = payload;

  try {
    // Get rater info for notification
    const rater = await prisma.user.findUnique({
      where: { id: raterId },
    });

    // 1. Update credit score for the ratee
    await handleNewRating(ratingId);

    // 2. Send new review notification to ratee
    await sendNewReviewNotification(
      rateeId,
      rater?.name || '匿名用户',
      score,
      ratingId
    );

    // 3. If it's a bad review (<= 2 stars), send warning
    if (score <= 2) {
      const creditDelta = calculateRatingCreditDelta(score);
      await sendBadReviewWarning(rateeId, score, creditDelta, ratingId);
    }

    // Emit event for other handlers
    reviewEvents.emit(ReviewEventType.RATING_SUBMITTED, {
      ...payload,
      processed: true,
    });

    console.log(`[REVIEW_EVENT] Rating ${ratingId} processed successfully`);
  } catch (error) {
    console.error(`[REVIEW_EVENT] Error processing rating ${ratingId}:`, error);
    throw error;
  }
}

/**
 * Handle rating deleted event
 * Recalculates credit score
 * @param payload - Rating deleted payload
 */
export async function handleRatingDeleted(
  payload: RatingDeletedPayload
): Promise<void> {
  const { ratingId, rateeId, score: _score } = payload;

  try {
    // Recalculate credit score for the ratee
    const newScore = await recalculateCreditScore(rateeId);

    // Emit event
    reviewEvents.emit(ReviewEventType.RATING_DELETED, {
      ...payload,
      newCreditScore: newScore,
      processed: true,
    });

    console.log(
      `[REVIEW_EVENT] Rating ${ratingId} deletion processed, new score: ${newScore}`
    );
  } catch (error) {
    console.error(
      `[REVIEW_EVENT] Error processing rating deletion ${ratingId}:`,
      error
    );
    throw error;
  }
}

/**
 * Handle rating updated event
 * Adjusts credit score based on score change
 * @param payload - Rating updated payload
 */
export async function handleRatingUpdated(
  payload: RatingUpdatedPayload
): Promise<void> {
  const { ratingId, rateeId, oldScore, newScore } = payload;

  try {
    // Calculate the credit delta difference
    const oldDelta = calculateRatingCreditDelta(oldScore);
    const newDelta = calculateRatingCreditDelta(newScore);
    const adjustment = newDelta - oldDelta;

    if (adjustment !== 0) {
      // Update credit score with the adjustment
      await updateCreditScore({
        userId: rateeId,
        delta: adjustment,
        reason: `Rating updated from ${oldScore} to ${newScore} stars`,
        sourceType: 'RATING_UPDATE',
        sourceId: ratingId,
        metadata: {
          oldScore,
          newScore,
          ratingId,
        },
      });
    }

    // Emit event
    reviewEvents.emit(ReviewEventType.RATING_UPDATED, {
      ...payload,
      creditAdjustment: adjustment,
      processed: true,
    });

    console.log(
      `[REVIEW_EVENT] Rating ${ratingId} update processed, adjustment: ${adjustment}`
    );
  } catch (error) {
    console.error(
      `[REVIEW_EVENT] Error processing rating update ${ratingId}:`,
      error
    );
    throw error;
  }
}

/**
 * Handle match completed event
 * Schedules review reminders
 * @param payload - Match completed payload
 */
export async function handleMatchCompleted(
  payload: MatchCompletedPayload
): Promise<void> {
  const { matchId, completedAt } = payload;

  try {
    // Schedule review reminders for 24 hours later
    await scheduleReviewReminders(matchId, completedAt);

    // Emit event
    reviewEvents.emit(ReviewEventType.MATCH_COMPLETED, {
      ...payload,
      remindersScheduled: true,
    });

    console.log(
      `[REVIEW_EVENT] Match ${matchId} completed, reminders scheduled`
    );
  } catch (error) {
    console.error(
      `[REVIEW_EVENT] Error processing match completion ${matchId}:`,
      error
    );
    throw error;
  }
}

/**
 * Setup credit score event listeners
 * Listens to events from creditScoreService
 */
export function setupCreditScoreListeners(): void {
  // Listen for credit score updates
  creditScoreEvents.on(
    'creditScoreUpdated',
    async (data: {
      userId: string;
      previousScore: number;
      newScore: number;
      delta: number;
      reason: string;
      sourceType: string;
      sourceId?: string;
    }) => {
      console.log(
        `[CREDIT_EVENT] User ${data.userId} score changed: ${data.previousScore} -> ${data.newScore}`
      );

      // Send notification for significant changes
      if (Math.abs(data.delta) >= 5) {
        await sendCreditScoreChangeNotification(
          data.userId,
          data.previousScore,
          data.newScore,
          data.reason
        );
      }
    }
  );

  // Listen for rating submissions
  creditScoreEvents.on(
    'ratingSubmitted',
    async (data: {
      ratingId: string;
      rateeId: string;
      raterId: string;
      score: number;
      delta: number;
    }) => {
      console.log(
        `[CREDIT_EVENT] Rating ${data.ratingId} submitted, delta: ${data.delta}`
      );
    }
  );
}

/**
 * Initialize all review event handlers
 * Sets up event listeners and handlers
 */
export function initializeReviewEventHandlers(): void {
  // Setup credit score event listeners
  setupCreditScoreListeners();

  // Setup review event listeners
  reviewEvents.on(
    ReviewEventType.RATING_SUBMITTED,
    (payload: RatingSubmittedPayload) => {
      console.log(`[EVENT] Rating submitted: ${payload.ratingId}`);
    }
  );

  reviewEvents.on(
    ReviewEventType.RATING_DELETED,
    (payload: RatingDeletedPayload) => {
      console.log(`[EVENT] Rating deleted: ${payload.ratingId}`);
    }
  );

  reviewEvents.on(
    ReviewEventType.RATING_UPDATED,
    (payload: RatingUpdatedPayload) => {
      console.log(`[EVENT] Rating updated: ${payload.ratingId}`);
    }
  );

  reviewEvents.on(
    ReviewEventType.MATCH_COMPLETED,
    (payload: MatchCompletedPayload) => {
      console.log(`[EVENT] Match completed: ${payload.matchId}`);
    }
  );

  console.log('[REVIEW_EVENT] Review event handlers initialized');
}

/**
 * Trigger rating submitted event programmatically
 * @param payload - Rating submitted payload
 */
export async function triggerRatingSubmitted(
  payload: RatingSubmittedPayload
): Promise<void> {
  await handleRatingSubmitted(payload);
}

/**
 * Trigger rating deleted event programmatically
 * @param payload - Rating deleted payload
 */
export async function triggerRatingDeleted(
  payload: RatingDeletedPayload
): Promise<void> {
  await handleRatingDeleted(payload);
}

/**
 * Trigger rating updated event programmatically
 * @param payload - Rating updated payload
 */
export async function triggerRatingUpdated(
  payload: RatingUpdatedPayload
): Promise<void> {
  await handleRatingUpdated(payload);
}

/**
 * Trigger match completed event programmatically
 * @param payload - Match completed payload
 */
export async function triggerMatchCompleted(
  payload: MatchCompletedPayload
): Promise<void> {
  await handleMatchCompleted(payload);
}
