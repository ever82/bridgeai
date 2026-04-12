/**
 * Smart Filter Service
 * Provides intelligent agent filtering with multi-criteria scoring and AI-assisted filtering
 */

import { Agent } from '../models/Agent';
import { SortingStrategy, sortAgents } from '../utils/sorting';

export interface FilterCriteria {
  skills?: string[];
  minRating?: number;
  maxHourlyRate?: number;
  availability?: boolean;
  location?: string;
  language?: string[];
  experienceYears?: number;
  verified?: boolean;
}

export interface FilterWeights {
  skillMatch: number;
  rating: number;
  price: number;
  availability: number;
  experience: number;
  verification: number;
}

export interface FilterResult {
  agent: Agent;
  score: number;
  matchDetails: {
    skillMatch: number;
    ratingScore: number;
    priceScore: number;
    availabilityScore: number;
    experienceScore: number;
    verificationScore: number;
  };
}

const DEFAULT_WEIGHTS: FilterWeights = {
  skillMatch: 0.3,
  rating: 0.25,
  price: 0.15,
  availability: 0.1,
  experience: 0.1,
  verification: 0.1,
};

/**
 * Calculate skill match score
 */
function calculateSkillMatch(agent: Agent, requiredSkills: string[]): number {
  if (!requiredSkills.length) return 1;

  const agentSkills = agent.skills.map(s => s.toLowerCase());
  const matches = requiredSkills.filter(skill =>
    agentSkills.includes(skill.toLowerCase())
  ).length;

  return matches / requiredSkills.length;
}

/**
 * Calculate price score (lower is better, up to max rate)
 */
function calculatePriceScore(agent: Agent, maxRate?: number): number {
  if (!maxRate || agent.hourlyRate <= maxRate) return 1;

  const ratio = maxRate / agent.hourlyRate;
  return Math.max(0, ratio);
}

/**
 * Calculate experience score
 */
function calculateExperienceScore(agent: Agent, minYears?: number): number {
  if (!minYears) return 1;

  if (agent.experienceYears >= minYears) return 1;
  return agent.experienceYears / minYears;
}

/**
 * Calculate availability score
 */
function calculateAvailabilityScore(agent: Agent, requireAvailable?: boolean): number {
  if (!requireAvailable) return 1;
  return agent.isAvailable ? 1 : 0;
}

/**
 * Calculate verification score
 */
function calculateVerificationScore(agent: Agent, requireVerified?: boolean): number {
  if (!requireVerified) return agent.isVerified ? 1 : 0.5;
  return agent.isVerified ? 1 : 0;
}

/**
 * Calculate rating score
 */
function calculateRatingScore(agent: Agent, minRating?: number): number {
  const rating = agent.rating || 0;

  if (minRating && rating < minRating) return 0;

  // Normalize rating to 0-1 scale (assuming 5-star max)
  return rating / 5;
}

/**
 * Apply smart filtering with multi-criteria scoring
 */
export function smartFilter(
  agents: Agent[],
  criteria: FilterCriteria,
  weights: FilterWeights = DEFAULT_WEIGHTS
): FilterResult[] {
  const results: FilterResult[] = agents.map(agent => {
    const skillMatch = calculateSkillMatch(agent, criteria.skills || []);
    const ratingScore = calculateRatingScore(agent, criteria.minRating);
    const priceScore = calculatePriceScore(agent, criteria.maxHourlyRate);
    const availabilityScore = calculateAvailabilityScore(agent, criteria.availability);
    const experienceScore = calculateExperienceScore(agent, criteria.experienceYears);
    const verificationScore = calculateVerificationScore(agent, criteria.verified);

    // Calculate weighted total score
    const score =
      skillMatch * weights.skillMatch +
      ratingScore * weights.rating +
      priceScore * weights.price +
      availabilityScore * weights.availability +
      experienceScore * weights.experience +
      verificationScore * weights.verification;

    return {
      agent,
      score,
      matchDetails: {
        skillMatch,
        ratingScore,
        priceScore,
        availabilityScore,
        experienceScore,
        verificationScore,
      },
    };
  });

  // Filter out agents with score below threshold (0.3)
  return results.filter(r => r.score > 0.3);
}

/**
 * AI-assisted filtering with natural language query
 */
export async function aiAssistedFilter(
  agents: Agent[],
  naturalLanguageQuery: string,
  aiService: { analyzeQuery: (query: string) => Promise<FilterCriteria> }
): Promise<FilterResult[]> {
  // Parse natural language query into structured criteria
  const criteria = await aiService.analyzeQuery(naturalLanguageQuery);

  // Apply smart filtering with parsed criteria
  return smartFilter(agents, criteria);
}

/**
 * Dynamically adjust weights based on user preferences
 */
export function adjustWeights(
  baseWeights: FilterWeights,
  preferences: Partial<FilterWeights>
): FilterWeights {
  const adjusted = { ...baseWeights, ...preferences };

  // Normalize weights to sum to 1
  const sum = Object.values(adjusted).reduce((a, b) => a + b, 0);

  return {
    skillMatch: adjusted.skillMatch / sum,
    rating: adjusted.rating / sum,
    price: adjusted.price / sum,
    availability: adjusted.availability / sum,
    experience: adjusted.experience / sum,
    verification: adjusted.verification / sum,
  };
}

/**
 * Get filter suggestions based on popular criteria
 */
export function getFilterSuggestions(agents: Agent[]): FilterCriteria[] {
  const suggestions: FilterCriteria[] = [
    { verified: true, minRating: 4.5 },
    { availability: true, minRating: 4.0 },
    { verified: true, availability: true },
  ];

  return suggestions;
}

/**
 * Combine filtering with sorting
 */
export function filterAndSort(
  agents: Agent[],
  criteria: FilterCriteria,
  sortStrategy: SortingStrategy,
  sortOrder: 'asc' | 'desc' = 'desc',
  weights?: FilterWeights
): FilterResult[] {
  const filtered = smartFilter(agents, criteria, weights);

  // Sort by the specified strategy
  return sortAgents(filtered, sortStrategy, sortOrder);
}
