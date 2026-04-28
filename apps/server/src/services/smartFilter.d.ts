/**
 * Smart Filter Service
 * Provides intelligent agent filtering with multi-criteria scoring and AI-assisted filtering
 */
import { Agent } from '../models/Agent';
import { SortingStrategy } from '../utils/sorting';
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
/**
 * Apply smart filtering with multi-criteria scoring
 */
export declare function smartFilter(agents: Agent[], criteria: FilterCriteria, weights?: FilterWeights): FilterResult[];
/**
 * AI-assisted filtering with natural language query
 */
export declare function aiAssistedFilter(agents: Agent[], naturalLanguageQuery: string, aiService: {
    analyzeQuery: (query: string) => Promise<FilterCriteria>;
}): Promise<FilterResult[]>;
/**
 * Dynamically adjust weights based on user preferences
 */
export declare function adjustWeights(baseWeights: FilterWeights, preferences: Partial<FilterWeights>): FilterWeights;
/**
 * Get filter suggestions based on popular criteria
 */
export declare function getFilterSuggestions(_agents: Agent[]): FilterCriteria[];
/**
 * Combine filtering with sorting
 */
export declare function filterAndSort(agents: Agent[], criteria: FilterCriteria, sortStrategy: SortingStrategy, sortOrder?: 'asc' | 'desc', weights?: FilterWeights): FilterResult[];
//# sourceMappingURL=smartFilter.d.ts.map