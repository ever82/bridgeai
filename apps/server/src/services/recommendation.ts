/**
 * Recommendation Service
 * Provides personalized agent recommendations using collaborative filtering and user preference learning
 */

import { Agent } from '../models/Agent';
import { calculateCompositeScore, calculateActivityScore } from '../utils/sorting';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';

/**
 * User preferences learned from interactions
 */
interface UserPreferences {
  userId: string;
  preferredSkills: string[];
  preferredCategories: string[];
  priceRange: { min: number; max: number };
  minRating: number;
  preferredLocation?: string;
  updatedAt: Date;
}

interface Recommendation {
  agent: Agent;
  score: number;
  reason: string;
}

// In-memory cache for user preferences (production should use a database table)
const preferencesCache = new Map<string, UserPreferences>();

/**
 * Learn user preferences from past ratings (hires and high-rated reviews)
 */
async function learnUserPreferencesFromRatings(userId: string): Promise<UserPreferences> {
  // Get ratings given by this user (their interactions with agents)
  const ratings = await prisma.rating.findMany({
    where: { raterId: userId },
    include: {
      match: {
        include: {
          demand: { include: { agent: true } },
          supply: { include: { agent: true } },
        },
      },
    },
  });

  const skillFrequency = new Map<string, number>();
  const categoryFrequency = new Map<string, number>();
  const ratings_scores: number[] = [];
  let totalSpent = 0;
  let hireCount = 0;

  for (const rating of ratings) {
    // Determine which agent was rated in this match
    const matchedAgent =
      rating.rateeId === rating.match?.demand?.agent?.userId
        ? rating.match?.supply?.agent
        : rating.match?.demand?.agent;

    if (!matchedAgent) continue;

    const agentConfig = matchedAgent.config as Record<string, any> | null;
    const skills: string[] = agentConfig?.skills || [];
    const category: string | undefined = agentConfig?.category;
    const hourlyRate: number = agentConfig?.hourlyRate || 50;

    // Count skills
    for (const skill of skills) {
      skillFrequency.set(skill, (skillFrequency.get(skill) || 0) + 1);
    }

    // Count categories
    if (category) {
      categoryFrequency.set(category, (categoryFrequency.get(category) || 0) + 1);
    }

    // Track ratings
    ratings_scores.push(rating.score);

    // Assume hire based on rating >= 4
    if (rating.score >= 4) {
      totalSpent += hourlyRate;
      hireCount++;
    }
  }

  // Sort by frequency and get top preferences
  const preferredSkills = Array.from(skillFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill]) => skill);

  const preferredCategories = Array.from(categoryFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);

  const avgRating =
    ratings_scores.length > 0
      ? ratings_scores.reduce((a, b) => a + b, 0) / ratings_scores.length
      : 4.0;

  const avgSpending = hireCount > 0 ? totalSpent / hireCount : 50;

  const preferences: UserPreferences = {
    userId,
    preferredSkills,
    preferredCategories,
    priceRange: { min: avgSpending * 0.5, max: avgSpending * 1.5 },
    minRating: Math.max(3.5, avgRating - 0.5),
    updatedAt: new Date(),
  };

  preferencesCache.set(userId, preferences);
  return preferences;
}

/**
 * Collaborative filtering - find similar users based on rating patterns
 */
async function findSimilarUsers(userId: string): Promise<string[]> {
  const targetPrefs = preferencesCache.get(userId);
  if (!targetPrefs) return [];

  // Get all users who have rated
  const allRatings = await prisma.rating.findMany({
    select: { raterId: true },
    distinct: ['raterId'],
  });

  const similarities: { userId: string; score: number }[] = [];

  for (const { raterId } of allRatings) {
    if (raterId === userId) continue;

    // Get cached preferences or learn them
    let prefs = preferencesCache.get(raterId);
    if (!prefs) {
      // Compute without caching to avoid side effects
      prefs = await computeUserPreferencesWithoutCache(raterId);
    }
    if (!prefs) continue;

    // Calculate Jaccard similarity for skills
    const skillIntersection = targetPrefs.preferredSkills.filter(s =>
      prefs.preferredSkills.includes(s)
    ).length;
    const skillUnion = new Set([...targetPrefs.preferredSkills, ...prefs.preferredSkills]).size;
    const skillSimilarity = skillUnion > 0 ? skillIntersection / skillUnion : 0;

    // Calculate category similarity
    const categoryIntersection = targetPrefs.preferredCategories.filter(c =>
      prefs.preferredCategories.includes(c)
    ).length;
    const categoryUnion = new Set([
      ...targetPrefs.preferredCategories,
      ...prefs.preferredCategories,
    ]).size;
    const categorySimilarity = categoryUnion > 0 ? categoryIntersection / categoryUnion : 0;

    // Combined similarity score
    const similarity = skillSimilarity * 0.6 + categorySimilarity * 0.4;

    if (similarity > 0.3) {
      similarities.push({ userId: raterId, score: similarity });
    }
  }

  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(s => s.userId);
}

/**
 * Compute user preferences without caching (for collaborative filtering)
 */
async function computeUserPreferencesWithoutCache(userId: string): Promise<UserPreferences | null> {
  const ratings = await prisma.rating.findMany({
    where: { raterId: userId },
    include: {
      match: {
        include: {
          demand: { include: { agent: true } },
          supply: { include: { agent: true } },
        },
      },
    },
  });

  if (ratings.length === 0) return null;

  const skillFrequency = new Map<string, number>();
  const categoryFrequency = new Map<string, number>();

  for (const rating of ratings) {
    const matchedAgent =
      rating.rateeId === rating.match?.demand?.agent?.userId
        ? rating.match?.supply?.agent
        : rating.match?.demand?.agent;

    if (!matchedAgent) continue;

    const agentConfig = matchedAgent.config as Record<string, any> | null;
    const skills: string[] = agentConfig?.skills || [];
    const category: string | undefined = agentConfig?.category;

    for (const skill of skills) {
      skillFrequency.set(skill, (skillFrequency.get(skill) || 0) + 1);
    }
    if (category) {
      categoryFrequency.set(category, (categoryFrequency.get(category) || 0) + 1);
    }
  }

  return {
    userId,
    preferredSkills: Array.from(skillFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill]) => skill),
    preferredCategories: Array.from(categoryFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category),
    priceRange: { min: 0, max: 1000 },
    minRating: 3.5,
    updatedAt: new Date(),
  };
}

/**
 * Get agents liked by similar users (hired or high-rated)
 */
async function getCollaborativeRecommendations(userId: string): Promise<string[]> {
  const similarUsers = await findSimilarUsers(userId);
  const recommendedAgentIds = new Set<string>();

  for (const similarUserId of similarUsers) {
    // Get high ratings from similar users
    const ratings = await prisma.rating.findMany({
      where: {
        raterId: similarUserId,
        score: { gte: 4 },
      },
      include: {
        match: {
          include: {
            demand: { include: { agent: true } },
            supply: { include: { agent: true } },
          },
        },
      },
    });

    for (const rating of ratings) {
      const matchedAgent =
        rating.rateeId === rating.match?.demand?.agent?.userId
          ? rating.match?.supply?.agent
          : rating.match?.demand?.agent;

      if (matchedAgent) {
        recommendedAgentIds.add(matchedAgent.id);
      }
    }
  }

  return Array.from(recommendedAgentIds);
}

/**
 * Check if user has already interacted with an agent
 */
async function hasUserInteractedWithAgent(userId: string, agentId: string): Promise<boolean> {
  const count = await prisma.rating.count({
    where: {
      raterId: userId,
      match: {
        OR: [
          { demand: { agent: { userId: agentId } } },
          { supply: { agent: { userId: agentId } } },
        ],
      },
    },
  });
  return count > 0;
}

/**
 * Calculate recommendation score for an agent
 */
async function calculateRecommendationScore(
  agent: Agent,
  preferences: UserPreferences,
  userId: string
): Promise<{ score: number; reason: string }> {
  let score = calculateCompositeScore(agent);
  const reasons: string[] = [];

  // Skill match bonus
  const skillMatches =
    agent.skills?.filter(s => preferences.preferredSkills.includes(s)).length || 0;
  if (skillMatches > 0) {
    score += skillMatches * 0.1;
    reasons.push(`Matches ${skillMatches} of your preferred skills`);
  }

  // Category match bonus
  if (preferences.preferredCategories.includes(agent.category || '')) {
    score += 0.2;
    reasons.push('In your preferred category');
  }

  // Price range bonus
  if (
    agent.hourlyRate >= preferences.priceRange.min &&
    agent.hourlyRate <= preferences.priceRange.max
  ) {
    score += 0.15;
    reasons.push('Within your preferred price range');
  }

  // Activity bonus
  const activityScore = calculateActivityScore(agent);
  if (activityScore > 0.8) {
    score += 0.1;
    reasons.push('Recently active');
  }

  // Verification bonus
  if (agent.isVerified) {
    score += 0.1;
  }

  // Penalty for already interacted agents
  const hasInteracted = await hasUserInteractedWithAgent(userId, agent.userId || '');
  if (hasInteracted) {
    score *= 0.7;
  }

  const reason = reasons.length > 0 ? reasons.join('; ') : 'Highly rated and active agent';

  return { score, reason };
}

/**
 * Get personalized recommendations for a user
 */
export async function getRecommendationsForUser(
  userId: string,
  agents: Agent[]
): Promise<Recommendation[]> {
  // Learn or get user preferences
  let preferences = preferencesCache.get(userId);
  if (!preferences) {
    preferences = await learnUserPreferencesFromRatings(userId);
  }

  // Get collaborative filtering recommendations
  const collaborativeIds = await getCollaborativeRecommendations(userId);

  // Calculate scores for all agents
  const recommendations: Recommendation[] = [];

  for (const agent of agents) {
    const { score, reason } = await calculateRecommendationScore(agent, preferences, userId);

    // Boost score for collaborative recommendations
    const collaborativeBoost = collaborativeIds.includes(agent.id) ? 0.3 : 0;

    recommendations.push({
      agent,
      score: score + collaborativeBoost,
      reason: collaborativeBoost > 0 ? `${reason}; Popular among similar users` : reason,
    });
  }

  // Sort by score and return top recommendations
  return recommendations.sort((a, b) => b.score - a.score).slice(0, 20);
}

/**
 * Record user interaction for learning (stores in preferences cache)
 */
export function recordInteraction(
  userId: string,
  agentId: string,
  type: 'view' | 'contact' | 'hire' | 'review',
  rating?: number
): void {
  // Invalidate preferences cache when user provides new interaction
  // Production should persist this to a database table
  preferencesCache.delete(userId);
  logger.debug('User interaction recorded for preference learning', {
    userId,
    agentId,
    type,
    rating,
  });
}

/**
 * Get recommendation explanation for a specific agent
 */
export async function getRecommendationExplanation(userId: string, agent: Agent): Promise<string> {
  let preferences = preferencesCache.get(userId);
  if (!preferences) {
    preferences = await learnUserPreferencesFromRatings(userId);
  }

  const { reason } = await calculateRecommendationScore(agent, preferences, userId);
  return reason;
}

/**
 * Feedback on recommendations
 */
export function recordRecommendationFeedback(
  userId: string,
  agentId: string,
  helpful: boolean
): void {
  const feedback = {
    userId,
    agentId,
    helpful,
    timestamp: new Date().toISOString(),
  };

  logger.info('Recommendation feedback recorded', feedback);
}
