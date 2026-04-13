/**
 * Image Search Index Service
 * Manages multi-dimensional index for image search with tag hierarchy
 */

export interface SearchIndex {
  id: string;
  imageId: string;
  userId: string;
  tags: IndexTag[];
  categories: string[];
  embedding: number[];
  metadata: IndexMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface IndexTag {
  name: string;
  confidence: number;
  category: TagCategory;
}

export type TagCategory =
  | 'object'
  | 'scene'
  | 'activity'
  | 'person'
  | 'animal'
  | 'nature'
  | 'architecture'
  | 'concept'
  | 'color'
  | 'time'
  | 'location'
  | 'event';

export interface IndexMetadata {
  description: string;
  colors: string[];
  objects: string[];
  scenes: string[];
  emotions: string[];
  quality: number;
  location?: { lat: number; lng: number; name?: string };
  createdAt: Date;
}

export interface TagHierarchy {
  root: string;
  children: TagNode[];
}

export interface TagNode {
  name: string;
  parent?: string;
  children: string[];
  synonyms: string[];
}

export interface IndexQuery {
  userId: string;
  tags?: string[];
  categories?: string[];
  embedding?: number[];
  semanticThreshold?: number;
  filters?: IndexFilters;
  sortBy?: 'relevance' | 'date' | 'quality';
  limit?: number;
  offset?: number;
}

export interface IndexFilters {
  dateRange?: { start: Date; end: Date };
  location?: { lat: number; lng: number; radius: number };
  quality?: { min: number; max: number };
  albums?: string[];
}

export interface IndexResult {
  index: SearchIndex;
  score: number;
  matchedTags: string[];
}

/**
 * Image Search Index Service
 * Manages multi-dimensional indexing for efficient image search
 */
export class ImageSearchIndexService {
  private indexes: Map<string, SearchIndex> = new Map();
  private tagHierarchy: Map<string, TagNode> = new Map();
  private userIndexes: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeTagHierarchy();
  }

  /**
   * Initialize tag classification hierarchy
   */
  private initializeTagHierarchy(): void {
    const hierarchy: TagNode[] = [
      {
        name: 'nature',
        children: ['landscape', 'wildlife', 'flowers', 'mountains', 'ocean', 'forest'],
        synonyms: ['outdoor', 'natural', 'environment']
      },
      {
        name: 'people',
        children: ['portrait', 'group', 'family', 'friends', 'selfie'],
        synonyms: ['person', 'human', 'individual']
      },
      {
        name: 'architecture',
        children: ['building', 'interior', 'cityscape', 'monument', 'bridge'],
        synonyms: ['structure', 'construction', 'design']
      },
      {
        name: 'event',
        children: ['wedding', 'party', 'concert', 'sports', 'travel', 'celebration'],
        synonyms: ['occasion', 'gathering', 'festival']
      },
      {
        name: 'food',
        children: ['meal', 'dessert', 'drink', 'cooking', 'restaurant'],
        synonyms: ['cuisine', 'dish', 'beverage']
      },
      {
        name: 'animal',
        children: ['pet', 'wildlife', 'bird', 'insect', 'marine'],
        synonyms: ['creature', 'beast', 'fauna']
      },
      {
        name: 'activity',
        children: ['sports', 'art', 'music', 'dance', 'hiking', 'reading'],
        synonyms: ['hobby', 'pastime', 'recreation']
      },
      {
        name: 'concept',
        children: ['love', 'peace', 'freedom', 'success', 'happiness', 'memory'],
        synonyms: ['idea', 'theme', 'emotion']
      }
    ];

    hierarchy.forEach(node => {
      this.tagHierarchy.set(node.name, node);
      node.children.forEach(child => {
        if (!this.tagHierarchy.has(child)) {
          this.tagHierarchy.set(child, {
            name: child,
            parent: node.name,
            children: [],
            synonyms: []
          });
        }
      });
    });
  }

  /**
   * Add or update an index
   */
  async addIndex(index: SearchIndex): Promise<void> {
    this.indexes.set(index.id, index);

    // Track user's indexes
    const userSet = this.userIndexes.get(index.userId) || new Set();
    userSet.add(index.id);
    this.userIndexes.set(index.userId, userSet);
  }

  /**
   * Search indexes with multi-dimensional matching
   */
  async search(query: IndexQuery): Promise<{ results: IndexResult[]; total: number }> {
    const userIndexIds = this.userIndexes.get(query.userId) || new Set();
    let candidates: SearchIndex[] = [];

    // Get all user's indexes
    for (const id of userIndexIds) {
      const index = this.indexes.get(id);
      if (index) {
        candidates.push(index);
      }
    }

    // Apply filters
    if (query.filters) {
      candidates = this.applyFilters(candidates, query.filters);
    }

    // Calculate scores
    let results: IndexResult[] = candidates.map(index => ({
      index,
      score: this.calculateScore(index, query),
      matchedTags: this.getMatchedTags(index, query)
    }));

    // Filter by semantic threshold
    if (query.semanticThreshold) {
      results = results.filter(r => r.score >= query.semanticThreshold!);
    }

    // Sort results
    results = this.sortResults(results, query.sortBy || 'relevance');

    // Get total before pagination
    const total = results.length;

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    results = results.slice(offset, offset + limit);

    return { results, total };
  }

  /**
   * Apply filters to candidates
   */
  private applyFilters(indexes: SearchIndex[], filters: IndexFilters): SearchIndex[] {
    return indexes.filter(index => {
      // Date range filter
      if (filters.dateRange) {
        const createdAt = index.metadata.createdAt;
        if (createdAt < filters.dateRange.start || createdAt > filters.dateRange.end) {
          return false;
        }
      }

      // Location filter
      if (filters.location && index.metadata.location) {
        const distance = this.calculateDistance(
          index.metadata.location,
          { lat: filters.location.lat, lng: filters.location.lng }
        );
        if (distance > filters.location.radius) {
          return false;
        }
      }

      // Quality filter
      if (filters.quality) {
        if (
          index.metadata.quality < filters.quality.min ||
          index.metadata.quality > filters.quality.max
        ) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculate relevance score for an index
   */
  private calculateScore(index: SearchIndex, query: IndexQuery): number {
    let score = 0;

    // Tag matching
    if (query.tags && query.tags.length > 0) {
      const tagScore = this.calculateTagScore(index.tags, query.tags);
      score += tagScore * 0.4;
    }

    // Category matching
    if (query.categories && query.categories.length > 0) {
      const categoryScore = this.calculateCategoryScore(index.categories, query.categories);
      score += categoryScore * 0.3;
    }

    // Semantic similarity
    if (query.embedding && query.embedding.length > 0 && index.embedding.length > 0) {
      const semanticScore = this.calculateCosineSimilarity(query.embedding, index.embedding);
      score += semanticScore * 0.3;
    }

    return score;
  }

  /**
   * Calculate tag matching score with hierarchy
   */
  private calculateTagScore(indexTags: IndexTag[], queryTags: string[]): number {
    let matches = 0;
    const expandedQueryTags = this.expandTagsWithHierarchy(queryTags);

    for (const queryTag of expandedQueryTags) {
      for (const indexTag of indexTags) {
        if (this.tagsMatch(indexTag.name, queryTag)) {
          matches += indexTag.confidence;
        }
      }
    }

    return matches / Math.max(queryTags.length, 1);
  }

  /**
   * Expand tags with hierarchical relationships
   */
  private expandTagsWithHierarchy(tags: string[]): string[] {
    const expanded = new Set(tags);

    for (const tag of tags) {
      const node = this.tagHierarchy.get(tag.toLowerCase());
      if (node) {
        // Add synonyms
        node.synonyms.forEach(syn => expanded.add(syn));
        // Add parent if exists
        if (node.parent) {
          expanded.add(node.parent);
        }
        // Add children
        node.children.forEach(child => expanded.add(child));
      }
    }

    return Array.from(expanded);
  }

  /**
   * Check if two tags match
   */
  private tagsMatch(tag1: string, tag2: string): boolean {
    return tag1.toLowerCase() === tag2.toLowerCase();
  }

  /**
   * Calculate category matching score
   */
  private calculateCategoryScore(indexCategories: string[], queryCategories: string[]): number {
    const matches = queryCategories.filter(qc =>
      indexCategories.some(ic => ic.toLowerCase() === qc.toLowerCase())
    );
    return matches.length / Math.max(queryCategories.length, 1);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get matched tags for a result
   */
  private getMatchedTags(index: SearchIndex, query: IndexQuery): string[] {
    const matched: string[] = [];

    if (query.tags) {
      for (const queryTag of query.tags) {
        for (const indexTag of index.tags) {
          if (this.tagsMatch(indexTag.name, queryTag)) {
            matched.push(indexTag.name);
          }
        }
      }
    }

    return matched;
  }

  /**
   * Sort results based on criteria
   */
  private sortResults(results: IndexResult[], sortBy: string): IndexResult[] {
    switch (sortBy) {
      case 'relevance':
        return results.sort((a, b) => b.score - a.score);
      case 'date':
        return results.sort(
          (a, b) => b.index.metadata.createdAt.getTime() - a.index.metadata.createdAt.getTime()
        );
      case 'quality':
        return results.sort((a, b) => b.index.metadata.quality - a.index.metadata.quality);
      default:
        return results;
    }
  }

  /**
   * Calculate distance between two coordinates (haversine formula)
   */
  private calculateDistance(
    loc1: { lat: number; lng: number },
    loc2: { lat: number; lng: number }
  ): number {
    const R = 6371e3; // Earth radius in meters
    const lat1 = loc1.lat * Math.PI / 180;
    const lat2 = loc2.lat * Math.PI / 180;
    const deltaLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const deltaLng = (loc2.lng - loc1.lng) * Math.PI / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Delete an index
   */
  async deleteIndex(indexId: string): Promise<boolean> {
    const index = this.indexes.get(indexId);
    if (!index) return false;

    this.indexes.delete(indexId);

    const userSet = this.userIndexes.get(index.userId);
    if (userSet) {
      userSet.delete(indexId);
    }

    return true;
  }

  /**
   * Get all tags in the hierarchy
   */
  async getTagHierarchy(): Promise<TagHierarchy> {
    const rootNodes = Array.from(this.tagHierarchy.values()).filter(n => !n.parent);

    return {
      root: 'all',
      children: rootNodes
    };
  }

  /**
   * Get popular tags for a user
   */
  async getPopularTags(userId: string, limit: number = 20): Promise<{ tag: string; count: number }[]> {
    const userIndexIds = this.userIndexes.get(userId) || new Set();
    const tagCounts = new Map<string, number>();

    for (const id of userIndexIds) {
      const index = this.indexes.get(id);
      if (index) {
        index.tags.forEach(tag => {
          const count = tagCounts.get(tag.name) || 0;
          tagCounts.set(tag.name, count + 1);
        });
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Update index
   */
  async updateIndex(indexId: string, updates: Partial<SearchIndex>): Promise<SearchIndex | null> {
    const index = this.indexes.get(indexId);
    if (!index) return null;

    const updated = { ...index, ...updates, updatedAt: new Date() };
    this.indexes.set(indexId, updated);
    return updated;
  }
}

// Singleton instance
let serviceInstance: ImageSearchIndexService | null = null;

export function getImageSearchIndexService(): ImageSearchIndexService {
  if (!serviceInstance) {
    serviceInstance = new ImageSearchIndexService();
  }
  return serviceInstance;
}
