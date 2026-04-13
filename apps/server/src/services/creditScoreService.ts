import { prisma } from '../db/client';
import { EventEmitter } from 'events';

// Credit Score Configuration
const CREDIT_SCORE_CONFIG = {
  // Good review: +5 points
  GOOD_REVIEW_SCORE: 5,
  // Bad review (score <= 2): -10 points
  BAD_REVIEW_SCORE: -10,
  // Each review count bonus (up to 20 reviews)
  REVIEW_COUNT_BONUS: 1,
  MAX_REVIEW_COUNT_BONUS: 20,
  // Reply rate bonus threshold (>= 80%)
  REPLY_RATE_THRESHOLD: 0.8,
  REPLY_RATE_BONUS: 10,
  // Default credit score
  DEFAULT_SCORE: 100,
  // Min/Max credit score
  MIN_SCORE: 0,
  MAX_SCORE: 1000,
};

// Credit Score Events
export const creditScoreEvents = new EventEmitter();

export interface CreditScoreUpdatePayload {
  userId: string;
  delta: number;
  reason: string;
  sourceType: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Calculate credit score based on rating score
 * @param ratingScore - The rating score (1-5)
 * @returns Credit score delta
 */
export function calculateRatingCreditDelta(ratingScore: number): number {
  if (ratingScore >= 4) {
    return CREDIT_SCORE_CONFIG.GOOD_REVIEW_SCORE;
  } else if (ratingScore <= 2) {
    return CREDIT_SCORE_CONFIG.BAD_REVIEW_SCORE;
  }
  return 0; // Neutral rating (3 stars)
}

/**
 * Calculate credit score based on review count
 * @param reviewCount - Total number of reviews received
 * @returns Credit score bonus
 */
export function calculateReviewCountBonus(reviewCount: number): number {
  const bonus = Math.min(
    reviewCount * CREDIT_SCORE_CONFIG.REVIEW_COUNT_BONUS,
    CREDIT_SCORE_CONFIG.MAX_REVIEW_COUNT_BONUS
  );
  return bonus;
}

/**
 * Calculate reply rate and credit bonus
 * @param totalReviews - Total reviews received
 * @param repliedReviews - Number of reviews with replies
 * @returns Credit score bonus
 */
export function calculateReplyRateBonus(
  totalReviews: number,
  repliedReviews: number
): number {
  if (totalReviews === 0) return 0;

  const replyRate = repliedReviews / totalReviews;
  if (replyRate >= CREDIT_SCORE_CONFIG.REPLY_RATE_THRESHOLD) {
    return CREDIT_SCORE_CONFIG.REPLY_RATE_BONUS;
  }
  return 0;
}

/**
 * Get current credit score for a user
 * @param userId - User ID
 * @returns Current credit score
 */
export async function getUserCreditScore(userId: string): Promise<number> {
  const latestRecord = await prisma.creditRecord.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return latestRecord?.score ?? CREDIT_SCORE_CONFIG.DEFAULT_SCORE;
}

/**
 * Update user's credit score
 * @param payload - Update payload
 * @returns Updated credit record
 */
export async function updateCreditScore(
  payload: CreditScoreUpdatePayload
): Promise<typeof prisma.creditRecord extends { create: (...args: any[]) => infer R } ? R : never> {
  const { userId, delta, reason, sourceType, sourceId, metadata } = payload;

  const currentScore = await getUserCreditScore(userId);
  const newScore = Math.max(
    CREDIT_SCORE_CONFIG.MIN_SCORE,
    Math.min(CREDIT_SCORE_CONFIG.MAX_SCORE, currentScore + delta)
  );

  const record = await prisma.creditRecord.create({
    data: {
      userId,
      score: newScore,
      delta,
      reason,
      sourceType,
      sourceId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  // Emit credit score updated event
  creditScoreEvents.emit('creditScoreUpdated', {
    userId,
    previousScore: currentScore,
    newScore,
    delta,
    reason,
    sourceType,
    sourceId,
  });

  return record;
}

/**
 * Recalculate user's credit score based on all ratings
 * @param userId - User ID
 * @returns Updated credit score
 */
export async function recalculateCreditScore(userId: string): Promise<number> {
  // Get all ratings received by the user
  const ratings = await prisma.rating.findMany({
    where: { rateeId: userId },
  });

  // Calculate base score from ratings
  let baseScore = CREDIT_SCORE_CONFIG.DEFAULT_SCORE;
  let goodReviewCount = 0;
  let badReviewCount = 0;

  for (const rating of ratings) {
    const delta = calculateRatingCreditDelta(rating.score);
    baseScore += delta;

    if (rating.score >= 4) {
      goodReviewCount++;
    } else if (rating.score <= 2) {
      badReviewCount++;
    }
  }

  // Add review count bonus
  const reviewCountBonus = calculateReviewCountBonus(ratings.length);

  // Calculate reply rate bonus
  // Note: This assumes we have a way to track replies
  // For now, we'll skip this as it requires additional schema
  const replyRateBonus = 0;

  // Calculate final score
  const finalScore = Math.max(
    CREDIT_SCORE_CONFIG.MIN_SCORE,
    Math.min(
      CREDIT_SCORE_CONFIG.MAX_SCORE,
      baseScore + reviewCountBonus + replyRateBonus
    )
  );

  // Create credit record for recalculation
  await prisma.creditRecord.create({
    data: {
      userId,
      score: finalScore,
      delta: finalScore - (await getUserCreditScore(userId)),
      reason: `Credit score recalculated: ${ratings.length} reviews, ${goodReviewCount} good, ${badReviewCount} bad`,
      sourceType: 'RECALCULATION',
      metadata: JSON.stringify({
        totalReviews: ratings.length,
        goodReviewCount,
        badReviewCount,
        reviewCountBonus,
        replyRateBonus,
      }),
    },
  });

  return finalScore;
}

/**
 * Handle new rating submission and update credit score
 * @param ratingId - The submitted rating ID
 */
export async function handleNewRating(ratingId: string): Promise<void> {
  const rating = await prisma.rating.findUnique({
    where: { id: ratingId },
    include: {
      match: true,
    },
  });

  if (!rating) {
    throw new Error(`Rating not found: ${ratingId}`);
  }

  const delta = calculateRatingCreditDelta(rating.score);

  if (delta !== 0) {
    await updateCreditScore({
      userId: rating.rateeId,
      delta,
      reason:
        delta > 0
          ? `Received a good review (${rating.score} stars)`
          : `Received a bad review (${rating.score} stars)`,
      sourceType: 'RATING',
      sourceId: ratingId,
      metadata: {
        ratingScore: rating.score,
        matchId: rating.matchId,
        comment: rating.comment,
      },
    });
  }

  // Emit event for notification
  creditScoreEvents.emit('ratingSubmitted', {
    ratingId,
    rateeId: rating.rateeId,
    raterId: rating.raterId,
    score: rating.score,
    delta,
  });
}

/**
 * Get credit score statistics for a user
 * @param userId - User ID
 * @returns Credit statistics
 */
export async function getCreditScoreStats(userId: string): Promise<{
  currentScore: number;
  totalReviews: number;
  goodReviews: number;
  badReviews: number;
  averageRating: number;
}> {
  const currentScore = await getUserCreditScore(userId);

  const ratings = await prisma.rating.findMany({
    where: { rateeId: userId },
  });

  const goodReviews = ratings.filter((r) => r.score >= 4).length;
  const badReviews = ratings.filter((r) => r.score <= 2).length;
  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
      : 0;

  return {
    currentScore,
    totalReviews: ratings.length,
    goodReviews,
    badReviews,
    averageRating: Math.round(averageRating * 10) / 10,
  };
}

export { CREDIT_SCORE_CONFIG };
