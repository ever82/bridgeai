/**
 * Sorting Utilities
 * Provides various sorting strategies for agent results
 */
import { Agent } from '../models/Agent';
import { FilterResult } from '../services/smartFilter';
export type SortingStrategy = 'relevance' | 'rating' | 'price' | 'experience' | 'activity' | 'credit' | 'composite';
export interface SortingOptions {
    strategy: SortingStrategy;
    order: 'asc' | 'desc';
    secondarySort?: SortingStrategy;
}
/**
 * Calculate composite score combining multiple factors
 */
export declare function calculateCompositeScore(agent: Agent): number;
/**
 * Calculate activity score based on recent activity
 */
export declare function calculateActivityScore(agent: Agent): number;
/**
 * Sort agents based on strategy
 */
export declare function sortAgents(results: FilterResult[], strategy: SortingStrategy, order?: 'asc' | 'desc'): FilterResult[];
/**
 * Sort raw agents (without filter results)
 */
export declare function sortRawAgents(agents: Agent[], strategy: SortingStrategy, order?: 'asc' | 'desc'): Agent[];
/**
 * Get sorting options for UI
 */
export declare function getSortingOptions(): {
    value: SortingStrategy;
    label: string;
}[];
/**
 * Compare two agents for equality (for testing)
 */
export declare function areAgentsEqual(a: Agent, b: Agent): boolean;
/**
 * Check if sorting produces stable results
 */
export declare function isStableSort(results: FilterResult[]): boolean;
//# sourceMappingURL=sorting.d.ts.map