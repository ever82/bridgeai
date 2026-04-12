/**
 * Sorting Utilities
 * Provides various sorting strategies for agent results
 */

import { Agent } from '../models/Agent';
import { FilterResult } from './smartFilter';

export type SortingStrategy =
  | 'relevance'
  | 'rating'
  | 'price'
  | 'experience'
  | 'activity'
  | 'credit'
  | 'composite';

export interface SortingOptions {
  strategy: SortingStrategy;
  order: 'asc' | 'desc';
  secondarySort?: SortingStrategy;
}

/**
 * Calculate composite score combining multiple factors
 */
export function calculateCompositeScore(agent: Agent): number {
  const ratingWeight = 0.3;
  const experienceWeight = 0.25;
  const activityWeight = 0.25;
  const creditWeight = 0.2;

  const ratingScore = (agent.rating || 0) / 5;
  const experienceScore = Math.min(agent.experienceYears / 10, 1);
  const activityScore = calculateActivityScore(agent);
  const creditScore = (agent.creditScore || 500) / 1000;

  return (
    ratingScore * ratingWeight +
    experienceScore * experienceWeight +
    activityScore * activityWeight +
    creditScore * creditWeight
  );
}

/**
 * Calculate activity score based on recent activity
 */
export function calculateActivityScore(agent: Agent): number {
  if (!agent.lastActiveAt) return 0;

  const now = new Date();
  const lastActive = new Date(agent.lastActiveAt);
  const daysSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);

  // Score decreases as days since last activity increases
  if (daysSinceActive <= 1) return 1;
  if (daysSinceActive <= 7) return 0.8;
  if (daysSinceActive <= 30) return 0.6;
  if (daysSinceActive <= 90) return 0.4;
  return 0.2;
}

/**
 * Sort by relevance (using filter score)
 */
function sortByRelevance(a: FilterResult, b: FilterResult): number {
  return b.score - a.score;
}

/**
 * Sort by rating
 */
function sortByRating(a: FilterResult, b: FilterResult, order: 'asc' | 'desc'): number {
  const diff = (b.agent.rating || 0) - (a.agent.rating || 0);
  return order === 'asc' ? -diff : diff;
}

/**
 * Sort by price
 */
function sortByPrice(a: FilterResult, b: FilterResult, order: 'asc' | 'desc'): number {
  const diff = a.agent.hourlyRate - b.agent.hourlyRate;
  return order === 'asc' ? diff : -diff;
}

/**
 * Sort by experience
 */
function sortByExperience(a: FilterResult, b: FilterResult, order: 'asc' | 'desc'): number {
  const diff = b.agent.experienceYears - a.agent.experienceYears;
  return order === 'asc' ? -diff : diff;
}

/**
 * Sort by activity
 */
function sortByActivity(a: FilterResult, b: FilterResult, order: 'asc' | 'desc'): number {
  const scoreA = calculateActivityScore(a.agent);
  const scoreB = calculateActivityScore(b.agent);
  const diff = scoreB - scoreA;
  return order === 'asc' ? -diff : diff;
}

/**
 * Sort by credit score
 */
function sortByCredit(a: FilterResult, b: FilterResult, order: 'asc' | 'desc'): number {
  const diff = (b.agent.creditScore || 500) - (a.agent.creditScore || 500);
  return order === 'asc' ? -diff : diff;
}

/**
 * Sort by composite score
 */
function sortByComposite(a: FilterResult, b: FilterResult, order: 'asc' | 'desc'): number {
  const scoreA = calculateCompositeScore(a.agent);
  const scoreB = calculateCompositeScore(b.agent);
  const diff = scoreB - scoreA;
  return order === 'asc' ? -diff : diff;
}

/**
 * Sort agents based on strategy
 */
export function sortAgents(
  results: FilterResult[],
  strategy: SortingStrategy,
  order: 'asc' | 'desc' = 'desc'
): FilterResult[] {
  const sorted = [...results];

  sorted.sort((a, b) => {
    switch (strategy) {
      case 'relevance':
        return sortByRelevance(a, b);
      case 'rating':
        return sortByRating(a, b, order);
      case 'price':
        return sortByPrice(a, b, order);
      case 'experience':
        return sortByExperience(a, b, order);
      case 'activity':
        return sortByActivity(a, b, order);
      case 'credit':
        return sortByCredit(a, b, order);
      case 'composite':
        return sortByComposite(a, b, order);
      default:
        return sortByRelevance(a, b);
    }
  });

  return sorted;
}

/**
 * Sort raw agents (without filter results)
 */
export function sortRawAgents(
  agents: Agent[],
  strategy: SortingStrategy,
  order: 'asc' | 'desc' = 'desc'
): Agent[] {
  // Convert to FilterResult format with default scores
  const results: FilterResult[] = agents.map(agent => ({
    agent,
    score: 1,
    matchDetails: {
      skillMatch: 1,
      ratingScore: 1,
      priceScore: 1,
      availabilityScore: 1,
      experienceScore: 1,
      verificationScore: 1,
    },
  }));

  const sorted = sortAgents(results, strategy, order);
  return sorted.map(r => r.agent);
}

/**
 * Get sorting options for UI
 */
export function getSortingOptions(): { value: SortingStrategy; label: string }[] {
  return [
    { value: 'relevance', label: 'Best Match' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'price', label: 'Lowest Price' },
    { value: 'experience', label: 'Most Experienced' },
    { value: 'activity', label: 'Most Active' },
    { value: 'credit', label: 'Credit Score' },
    { value: 'composite', label: 'Overall Score' },
  ];
}

/**
 * Compare two agents for equality (for testing)
 */
export function areAgentsEqual(a: Agent, b: Agent): boolean {
  return a.id === b.id;
}

/**
 * Check if sorting produces stable results
 */
export function isStableSort(results: FilterResult[]): boolean {
  const seenScores = new Map<number, number>();

  for (const result of results) {
    const count = seenScores.get(result.score) || 0;
    seenScores.set(result.score, count + 1);
  }

  // If any score appears more than once, we need stable sort
  return Array.from(seenScores.values()).some(count => count > 1);
}
