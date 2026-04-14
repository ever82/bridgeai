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
    timeOfDay: { hour: number; count: number }[];
    dayOfWeek: { day: number; count: number }[];
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
export class SearchRecommendationService {
  private searchHistory: Map<string, string[]> = new Map();
  private trendingSearches: Map<string, { count: number; lastUsed: Date }> = new Map();
  private userProfiles: Map<string, UserSearchProfile> = new Map();
  private similarQueries: Map<string, Set<string>> = new Map();

  constructor() {
    // Initialize with some trending searches
    this.initializeTrendingSearches();
  }

  private initializeTrendingSearches(): void {
    const initialTrends = [
      'summer vacation',
      'family photos',
      'sunset',
      'beach',
      'wedding',
      'travel',
      'birthday',
      'pets',
      'nature',
      'cityscape'
    ];

    initialTrends.forEach(query => {
      this.trendingSearches.set(query, {
        count: Math.floor(Math.random() * 100) + 50,
        lastUsed: new Date()
      });
    });
  }

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(userId: string, limit: number = 10): Promise<SearchRecommendation[]> {
    const recommendations: SearchRecommendation[] = [];

    // 1. History-based recommendations (30%)
    const historyBased = await this.getHistoryBasedRecommendations(userId);
    recommendations.push(...historyBased.slice(0, Math.ceil(limit * 0.3)));

    // 2. Trending recommendations (30%)
    const trending = await this.getTrendingRecommendations(userId);
    recommendations.push(...trending.slice(0, Math.ceil(limit * 0.3)));

    // 3. Similar content recommendations (25%)
    const similar = await this.getSimilarRecommendations(userId);
    recommendations.push(...similar.slice(0, Math.ceil(limit * 0.25)));

    // 4. Discovery recommendations (15%)
    const discovery = await this.getDiscoveryRecommendations(userId);
    recommendations.push(...discovery.slice(0, Math.ceil(limit * 0.15)));

    // Sort by score and deduplicate
    const seen = new Set<string>();
    return recommendations
      .sort((a, b) => b.score - a.score)
      .filter(rec => {
        if (seen.has(rec.query)) return false;
        seen.add(rec.query);
        return true;
      })
      .slice(0, limit);
  }

  /**
   * Get recommendations based on user's search history
   */
  private async getHistoryBasedRecommendations(userId: string): Promise<SearchRecommendation[]> {
    const history = this.searchHistory.get(userId) || [];
    const profile = this.getUserProfile(userId);

    if (history.length === 0) {
      return [];
    }

    const recommendations: SearchRecommendation[] = [];

    // Recent searches with variations
    const recentSearches = history.slice(0, 5);
    recentSearches.forEach((query, index) => {
      // Slight variations of recent searches
      const variations = this.generateVariations(query);
      variations.forEach((variation, vIndex) => {
        recommendations.push({
          type: 'history',
          query: variation,
          score: 0.9 - (index * 0.1) - (vIndex * 0.05),
          metadata: {
            icon: '↻',
            reason: 'Based on your recent search',
            category: 'Recent'
          }
        });
      });
    });

    // Category-based recommendations
    profile.preferredCategories.forEach((category, index) => {
      recommendations.push({
        type: 'personal',
        query: `${category} photos`,
        score: 0.8 - (index * 0.1),
        metadata: {
          icon: '⭐',
          reason: 'Based on your interests',
          category: 'Personal'
        }
      });
    });

    return recommendations;
  }

  /**
   * Get trending search recommendations
   */
  private async getTrendingRecommendations(userId: string): Promise<SearchRecommendation[]> {
    const userHistory = new Set(this.searchHistory.get(userId) || []);

    const trends = Array.from(this.trendingSearches.entries())
      .filter(([query]) => !userHistory.has(query))
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    return trends.map(([query, data], index) => ({
      type: 'trending',
      query,
      score: 0.85 - (index * 0.05),
      metadata: {
        icon: '🔥',
        category: 'Trending',
        count: data.count,
        reason: `${data.count} searches today`
      }
    }));
  }

  /**
   * Get similar content recommendations
   */
  private async getSimilarRecommendations(userId: string): Promise<SearchRecommendation[]> {
    const history = this.searchHistory.get(userId) || [];
    const recommendations: SearchRecommendation[] = [];

    // Find similar queries to user's history
    for (const query of history.slice(0, 3)) {
      const similar = this.similarQueries.get(query);
      if (similar) {
        similar.forEach((similarQuery, index) => {
          recommendations.push({
            type: 'similar',
            query: similarQuery,
            score: 0.75 - (index * 0.05),
            metadata: {
              icon: '💡',
              reason: `Similar to "${query}"`,
              category: 'Similar'
            }
          });
        });
      }
    }

    // Add some generic similar suggestions based on popular categories
    const popularSimilar = [
      'beach sunset',
      'mountain hiking',
      'city night',
      'family gathering',
      'pet portrait'
    ];

    popularSimilar.forEach((query, index) => {
      if (!history.includes(query)) {
        recommendations.push({
          type: 'similar',
          query,
          score: 0.7 - (index * 0.03),
          metadata: {
            icon: '📸',
            reason: 'Popular category',
            category: 'Similar'
          }
        });
      }
    });

    return recommendations;
  }

  /**
   * Get discovery recommendations
   */
  private async getDiscoveryRecommendations(userId: string): Promise<SearchRecommendation[]> {
    const history = new Set(this.searchHistory.get(userId) || []);

    const discoveryQueries = [
      { query: 'hidden gems', icon: '💎', reason: 'Discover something new' },
      { query: 'black and white', icon: '⚫', reason: 'Different perspective' },
      { query: 'minimalist', icon: '◽', reason: 'Simple beauty' },
      { query: 'candid moments', icon: '😊', reason: 'Natural shots' },
      { query: 'golden hour', icon: '🌅', reason: 'Perfect lighting' },
      { query: 'reflections', icon: '🪞', reason: 'Creative compositions' }
    ];

    return discoveryQueries
      .filter(({ query }) => !history.has(query))
      .map(({ query, icon, reason }, index) => ({
        type: 'discovery',
        query,
        score: 0.65 - (index * 0.05),
        metadata: {
          icon,
          reason,
          category: 'Discover'
        }
      }));
  }

  /**
   * Record a search for personalization
   */
  async recordSearch(userId: string, query: string): Promise<void> {
    // Update user's search history
    const history = this.searchHistory.get(userId) || [];
    history.unshift(query);
    if (history.length > 50) {
      history.pop();
    }
    this.searchHistory.set(userId, history);

    // Update trending
    const existing = this.trendingSearches.get(query);
    if (existing) {
      existing.count++;
      existing.lastUsed = new Date();
    } else {
      this.trendingSearches.set(query, {
        count: 1,
        lastUsed: new Date()
      });
    }

    // Update user profile
    this.updateUserProfile(userId, query);

    // Update similar queries
    this.updateSimilarQueries(query);
  }

  /**
   * Update user search profile
   */
  private updateUserProfile(userId: string, query: string): void {
    const profile = this.getUserProfile(userId);

    // Update top queries
    if (!profile.topQueries.includes(query)) {
      profile.topQueries.unshift(query);
      if (profile.topQueries.length > 20) {
        profile.topQueries.pop();
      }
    }

    // Update search patterns
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    const hourEntry = profile.searchPatterns.timeOfDay.find(h => h.hour === hour);
    if (hourEntry) {
      hourEntry.count++;
    } else {
      profile.searchPatterns.timeOfDay.push({ hour, count: 1 });
    }

    const dayEntry = profile.searchPatterns.dayOfWeek.find(d => d.day === day);
    if (dayEntry) {
      dayEntry.count++;
    } else {
      profile.searchPatterns.dayOfWeek.push({ day, count: 1 });
    }

    profile.lastSearchAt = now;
    this.userProfiles.set(userId, profile);
  }

  /**
   * Get or create user profile
   */
  private getUserProfile(userId: string): UserSearchProfile {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = {
        userId,
        topQueries: [],
        preferredCategories: [],
        searchPatterns: {
          timeOfDay: [],
          dayOfWeek: []
        }
      };
      this.userProfiles.set(userId, profile);
    }
    return profile;
  }

  /**
   * Update similar queries mapping
   */
  private updateSimilarQueries(query: string): void {
    // Simple similarity based on word overlap
    const words = query.toLowerCase().split(' ');

    for (const [existingQuery, similarSet] of this.similarQueries) {
      const existingWords = existingQuery.toLowerCase().split(' ');
      const overlap = words.filter(w => existingWords.includes(w));

      if (overlap.length > 0 && existingQuery !== query) {
        similarSet.add(query);

        const reverseSet = this.similarQueries.get(query) || new Set();
        reverseSet.add(existingQuery);
        this.similarQueries.set(query, reverseSet);
      }
    }

    // Initialize if not exists
    if (!this.similarQueries.has(query)) {
      this.similarQueries.set(query, new Set());
    }
  }

  /**
   * Generate variations of a query
   */
  private generateVariations(query: string): string[] {
    const variations: string[] = [];
    const words = query.split(' ');

    // Add modifiers
    const modifiers = ['best', 'recent', 'favorite', 'top'];
    modifiers.forEach(mod => {
      variations.push(`${mod} ${query}`);
    });

    // Add related terms
    if (words.length > 1) {
      variations.push(words.slice(1).join(' '));
    }

    return variations.slice(0, 3);
  }

  /**
   * Get current search trends
   */
  async getTrends(limit: number = 10): Promise<SearchTrend[]> {
    const trends = Array.from(this.trendingSearches.entries())
      .map(([query, data]) => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const isRecent = data.lastUsed > yesterday;
        const changePercent = isRecent ? Math.random() * 50 : Math.random() * 20 - 10;

        return {
          query,
          count: data.count,
          trend: changePercent > 10 ? 'up' : changePercent < -10 ? 'down' : 'stable',
          changePercent: Math.abs(changePercent)
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return trends;
  }

  /**
   * Get discovery feed for a user
   */
  async getDiscoveryFeed(userId: string, limit: number = 10): Promise<DiscoveryResult[]> {
    const history = this.searchHistory.get(userId) || [];
    const recommendations = await this.getRecommendations(userId, limit);

    return recommendations.map((rec, index) => ({
      id: `disc_${userId}_${index}`,
      type: 'photo',
      title: rec.query,
      description: rec.metadata?.reason,
      relevanceScore: rec.score,
      reason: rec.metadata?.reason || 'Recommended for you'
    }));
  }

  /**
   * Clear user's search history
   */
  async clearHistory(userId: string): Promise<void> {
    this.searchHistory.delete(userId);
    this.userProfiles.delete(userId);
  }

  /**
   * Get user's search profile
   */
  async getUserSearchProfile(userId: string): Promise<UserSearchProfile | null> {
    return this.userProfiles.get(userId) || null;
  }
}

// Singleton instance
let serviceInstance: SearchRecommendationService | null = null;

export function getSearchRecommendationService(): SearchRecommendationService {
  if (!serviceInstance) {
    serviceInstance = new SearchRecommendationService();
  }
  return serviceInstance;
}
