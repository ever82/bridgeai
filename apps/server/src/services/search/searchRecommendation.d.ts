/**
 * Search Recommendation Service
 * Provides personalized search suggestions and content discovery
 */
export interface SearchRecommendation {
    type: 'trending' | 'personal' | 'similar' | 'discovery' | 'history';
    query: string;
    score: number;
    metadata?: {
        icon?: string;
        category?: string;
        reason?: string;
        count?: number;
    };
}
export interface SearchTrend {
    query: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
}
export interface UserSearchProfile {
    userId: string;
    topQueries: string[];
    preferredCategories: string[];
    searchPatterns: {
        timeOfDay: {
            hour: number;
            count: number;
        }[];
        dayOfWeek: {
            day: number;
            count: number;
        }[];
    };
    lastSearchAt?: Date;
}
export interface DiscoveryResult {
    id: string;
    type: 'photo' | 'album' | 'tag' | 'user';
    title: string;
    description?: string;
    thumbnailUrl?: string;
    relevanceScore: number;
    reason: string;
}
/**
 * Search Recommendation Service
 * Generates personalized search suggestions and trending content
 */
export declare class SearchRecommendationService {
    private searchHistory;
    private trendingSearches;
    private userProfiles;
    private similarQueries;
    constructor();
    private initializeTrendingSearches;
    /**
     * Get personalized recommendations for a user
     */
    getRecommendations(userId: string, limit?: number): Promise<SearchRecommendation[]>;
    /**
     * Get recommendations based on user's search history
     */
    private getHistoryBasedRecommendations;
    /**
     * Get trending search recommendations
     */
    private getTrendingRecommendations;
    /**
     * Get similar content recommendations
     */
    private getSimilarRecommendations;
    /**
     * Get discovery recommendations
     */
    private getDiscoveryRecommendations;
    /**
     * Record a search for personalization
     */
    recordSearch(userId: string, query: string): Promise<void>;
    /**
     * Update user search profile
     */
    private updateUserProfile;
    /**
     * Get or create user profile
     */
    private getUserProfile;
    /**
     * Update similar queries mapping
     */
    private updateSimilarQueries;
    /**
     * Generate variations of a query
     */
    private generateVariations;
    /**
     * Get current search trends
     */
    getTrends(limit?: number): Promise<SearchTrend[]>;
    /**
     * Get discovery feed for a user
     */
    getDiscoveryFeed(userId: string, limit?: number): Promise<DiscoveryResult[]>;
    /**
     * Clear user's search history
     */
    clearHistory(userId: string): Promise<void>;
    /**
     * Get user's search profile
     */
    getUserSearchProfile(userId: string): Promise<UserSearchProfile | null>;
}
export declare function getSearchRecommendationService(): SearchRecommendationService;
//# sourceMappingURL=searchRecommendation.d.ts.map