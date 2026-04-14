/**
 * Recommendation Service
 * Provides personalized agent recommendations using collaborative filtering and user preference learning
 */

import { Agent } from '../models/Agent';
import { FilterResult, smartFilter } from './smartFilter';
import { calculateCompositeScore, calculateActivityScore } from '../utils/sorting';

// Mock user preferences database (in production, use a real database)
const userPreferencesDB = new Map<string, UserPreferences>();
const userInteractionsDB = new Map<string, UserInteraction[]>();

interface UserPreferences {
  userId: string;
  preferredSkills: string[];
  preferredCategories: string[];
  priceRange: { min: number; max: number };
  minRating: number;
  preferredLocation?: string;
  updatedAt: Date;
}

interface UserInteraction {
  userId: string;
  agentId: string;
  type: 'view' | 'contact' | 'hire' | 'review';
  rating?: number;
  timestamp: Date;
}

interface Recommendation {
  agent: Agent;
  score: number;
  reason: string;
}

/**
 * Learn user preferences from interactions
 */
export async function learnUserPreferences(userId: string): Promise<UserPreferences> {
  const interactions = userInteractionsDB.get(userId) || [];

  // Aggregate preferences from past interactions
  const skillFrequency = new Map<string, number>();
  const categoryFrequency = new Map<string, number>();
  const ratings: number[] = [];
  let totalSpent = 0;
  let hireCount = 0;

  for (const interaction of interactions) {
    // Get agent details from interaction
    const agent = await getAgentById(interaction.agentId);
    if (!agent) continue;

    // Count skills
    for (const skill of agent.skills || []) {
      skillFrequency.set(skill, (skillFrequency.get(skill) || 0) + 1);
    }

    // Count categories
    if (agent.category) {
      categoryFrequency.set(agent.category, (categoryFrequency.get(agent.category) || 0) + 1);
    }

    // Track ratings
    if (interaction.rating) {
      ratings.push(interaction.rating);
    }

    // Track spending
    if (interaction.type === 'hire') {
      totalSpent += agent.hourlyRate || 0;
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

  const avgRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
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

  userPreferencesDB.set(userId, preferences);
  return preferences;
}

/**
 * Collaborative filtering - find similar users
 */
async function findSimilarUsers(userId: string): Promise<string[]> {
  const targetPrefs = userPreferencesDB.get(userId);
  if (!targetPrefs) return [];

  const similarities: { userId: string; score: number }[] = [];

  for (const [otherUserId, prefs] of userPreferencesDB.entries()) {
    if (otherUserId === userId) continue;

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
    const categoryUnion = new Set([...targetPrefs.preferredCategories, ...prefs.preferredCategories]).size;
    const categorySimilarity = categoryUnion > 0 ? categoryIntersection / categoryUnion : 0;

    // Combined similarity score
    const similarity = skillSimilarity * 0.6 + categorySimilarity * 0.4;

    if (similarity > 0.3) {
      similarities.push({ userId: otherUserId, score: similarity });
    }
  }

  // Return top 10 similar users
  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(s => s.userId);
}

/**
 * Get agents liked by similar users
 */
async function getCollaborativeRecommendations(userId: string): Promise<string[]> {
  const similarUsers = await findSimilarUsers(userId);
  const recommendedAgentIds = new Set<string>();

  for (const similarUserId of similarUsers) {
    const interactions = userInteractionsDB.get(similarUserId) || [];
    for (const interaction of interactions) {
      if (interaction.type === 'hire' || (interaction.type === 'review' && interaction.rating && interaction.rating >= 4)) {
        recommendedAgentIds.add(interaction.agentId);
      }
    }
  }

  return Array.from(recommendedAgentIds);
}

/**
 * Calculate recommendation score for an agent
 */
function calculateRecommendationScore(
  agent: Agent,
  preferences: UserPreferences,
  userId: string
): { score: number; reason: string } {
  let score = calculateCompositeScore(agent);
  const reasons: string[] = [];

  // Skill match bonus
  const skillMatches = agent.skills?.filter(s =>
    preferences.preferredSkills.includes(s)
  ).length || 0;
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
  if (agent.hourlyRate >= preferences.priceRange.min &&
      agent.hourlyRate <= preferences.priceRange.max) {
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
  const interactions = userInteractionsDB.get(userId) || [];
  const hasInteracted = interactions.some(i => i.agentId === agent.id);
  if (hasInteracted) {
    score *= 0.7; // Reduce score for already seen agents
  }

  const reason = reasons.length > 0
    ? reasons.join('; ')
    : 'Highly rated and active agent';

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
  let preferences = userPreferencesDB.get(userId);
  if (!preferences) {
    preferences = await learnUserPreferences(userId);
  }

  // Get collaborative filtering recommendations
  const collaborativeIds = await getCollaborativeRecommendations(userId);

  // Calculate scores for all agents
  const recommendations: Recommendation[] = [];

  for (const agent of agents) {
    const { score, reason } = calculateRecommendationScore(agent, preferences, userId);

    // Boost score for collaborative recommendations
    const collaborativeBoost = collaborativeIds.includes(agent.id) ? 0.3 : 0;

    recommendations.push({
      agent,
      score: score + collaborativeBoost,
      reason: collaborativeBoost > 0
        ? `${reason}; Popular among similar users`
        : reason,
    });
  }

  // Sort by score and return top recommendations
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

/**
 * Record user interaction for learning
 */
export function recordInteraction(
  userId: string,
  agentId: string,
  type: 'view' | 'contact' | 'hire' | 'review',
  rating?: number
): void {
  const interactions = userInteractionsDB.get(userId) || [];
  interactions.push({
    userId,
    agentId,
    type,
    rating,
    timestamp: new Date(),
  });
  userInteractionsDB.set(userId, interactions);
}

/**
 * Get recommendation explanation for a specific agent
 */
export function getRecommendationExplanation(
  userId: string,
  agent: Agent
): string {
  const preferences = userPreferencesDB.get(userId);
  if (!preferences) {
    return 'Recommended based on overall quality and activity';
  }

  const { reason } = calculateRecommendationScore(agent, preferences, userId);
  return reason;
}

/**
 * Mock function to get agent by ID
 */
async function getAgentById(agentId: string): Promise<Agent | null> {
  // In production, query the database
  return null;
}

/**
 * Feedback on recommendations
 */
export function recordRecommendationFeedback(
  userId: string,
  agentId: string,
  helpful: boolean
): void {
  // Store feedback for model improvement
  const feedback = {
    userId,
    agentId,
    helpful,
    timestamp: new Date(),
  };

  // In production, save to database for model training
  console.log('Recommendation feedback recorded:', feedback);
}
