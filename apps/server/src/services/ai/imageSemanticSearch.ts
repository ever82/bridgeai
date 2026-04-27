/**
 * Image Semantic Search Service
 * AI-powered natural language image search with semantic matching
 */

import { LLMService } from './llmService';
import { EmbeddingRequest, EmbeddingResponse } from './types';

export interface SearchQuery {
  query: string;
  userId: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

export interface SearchFilters {
  dateRange?: { start: Date; end: Date };
  tags?: string[];
  location?: { lat: number; lng: number; radius: number };
  albums?: string[];
  favoritesOnly?: boolean;
}

export interface SearchResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  tags: string[];
  confidence: number;
  metadata: ImageMetadata;
  matchedTerms: string[];
}

export interface ImageMetadata {
  createdAt: Date;
  location?: { lat: number; lng: number; name?: string };
  camera?: string;
  dimensions?: { width: number; height: number };
  fileSize?: number;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  resultCount: number;
  filters?: SearchFilters;
}

export interface SemanticAnalysis {
  concepts: string[];
  entities: string[];
  attributes: Record<string, string>;
  intent: 'search' | 'filter' | 'discover' | 'navigate';
  temporalContext?: { start?: Date; end?: Date };
  spatialContext?: { location?: string; near?: string };
}

/**
 * Image Semantic Search Service
 */
export class ImageSemanticSearchService {
  private llmService: LLMService;
  private searchHistory: Map<string, SearchHistoryItem[]> = new Map();
  private readonly MAX_HISTORY_PER_USER = 50;

  // In-memory semantic image index
  private imageIndex: Map<string, { embedding: number[]; result: SearchResult }> = new Map();

  constructor(llmService: LLMService) {
    this.llmService = llmService;
  }

  /**
   * Index an image with its embedding for semantic search
   */
  async indexImage(
    imageId: string,
    imageData: {
      url: string;
      thumbnailUrl: string;
      title?: string;
      description?: string;
      tags?: string[];
      metadata?: ImageMetadata;
    }
  ): Promise<void> {
    const textToEmbed = [
      imageData.title || '',
      imageData.description || '',
      ...(imageData.tags || []),
    ]
      .join(' ')
      .trim();

    const embedding = textToEmbed
      ? await this.generateQueryEmbedding(textToEmbed)
      : new Array(512).fill(0);

    const result: SearchResult = {
      id: imageId,
      url: imageData.url,
      thumbnailUrl: imageData.thumbnailUrl,
      title: imageData.title || '',
      description: imageData.description || '',
      tags: imageData.tags || [],
      confidence: 1.0,
      metadata: imageData.metadata || {
        createdAt: new Date(),
      },
      matchedTerms: [],
    };

    this.imageIndex.set(imageId, { embedding, result });
  }

  /**
   * Remove an image from the search index
   */
  async removeFromIndex(imageId: string): Promise<void> {
    this.imageIndex.delete(imageId);
  }

  /**
   * Get total indexed image count
   */
  getIndexSize(): number {
    return this.imageIndex.size;
  }

  /**
   * Perform semantic search with natural language query
   */
  async search(query: SearchQuery): Promise<{
    results: SearchResult[];
    total: number;
    analysis: SemanticAnalysis;
    suggestions: string[];
  }> {
    // Analyze query semantics
    const analysis = await this.analyzeQuery(query.query);

    // Generate query embedding for semantic matching
    const queryEmbedding = await this.generateQueryEmbedding(query.query);

    // Search with filters
    const { results, total } = await this.executeSearch(
      queryEmbedding,
      analysis,
      query.filters,
      query.limit || 20,
      query.offset || 0
    );

    // Generate suggestions based on results and query
    const suggestions = await this.generateSuggestions(query.query, analysis, results);

    // Record search history
    await this.recordSearchHistory(query.userId, query.query, results.length, query.filters);

    return {
      results,
      total,
      analysis,
      suggestions,
    };
  }

  /**
   * Analyze natural language query to extract semantics
   */
  private async analyzeQuery(query: string): Promise<SemanticAnalysis> {
    const prompt = `
      Analyze this image search query and extract key information:
      Query: "${query}"

      Return a JSON object with:
      - concepts: array of main concepts/themes
      - entities: array of specific objects/people/places mentioned
      - attributes: object with attributes like color, style, mood, time
      - intent: one of [search, filter, discover, navigate]
      - temporalContext: any time references (optional)
      - spatialContext: any location references (optional)
    `;

    try {
      const response = await this.llmService.chatCompletion({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an AI that analyzes image search queries. Return only valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      return {
        concepts: parsed.concepts || [],
        entities: parsed.entities || [],
        attributes: parsed.attributes || {},
        intent: parsed.intent || 'search',
        temporalContext: parsed.temporalContext,
        spatialContext: parsed.spatialContext,
      };
    } catch (error) {
      console.error('Query analysis failed:', error);
      return {
        concepts: [],
        entities: [],
        attributes: {},
        intent: 'search',
      };
    }
  }

  /**
   * Generate embedding for search query
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      const request: EmbeddingRequest = {
        model: 'text-embedding-3-small',
        input: query,
        dimensions: 512,
      };

      const response: EmbeddingResponse = await this.llmService.createEmbedding(request);
      return response.data[0]?.embedding || [];
    } catch (error) {
      console.error('Embedding generation failed:', error);
      return [];
    }
  }

  /**
   * Execute search with filters using cosine similarity
   */
  private async executeSearch(
    queryEmbedding: number[],
    analysis: SemanticAnalysis,
    filters: SearchFilters | undefined,
    limit: number,
    offset: number
  ): Promise<{ results: SearchResult[]; total: number }> {
    if (queryEmbedding.length === 0 || this.imageIndex.size === 0) {
      return { results: [], total: 0 };
    }

    // Calculate cosine similarity against all indexed images
    const scored: Array<{ score: number; result: SearchResult }> = [];
    const searchTerms = [
      ...analysis.concepts,
      ...analysis.entities,
      ...Object.values(analysis.attributes),
    ].filter(Boolean);

    for (const [, entry] of this.imageIndex) {
      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);

      // Apply filters
      if (filters && !this.matchesFilters(entry.result, filters)) {
        continue;
      }

      scored.push({
        score: similarity,
        result: {
          ...entry.result,
          confidence: similarity,
          matchedTerms: searchTerms.filter(
            term =>
              entry.result.title.includes(term) ||
              entry.result.description.includes(term) ||
              entry.result.tags.some(tag => tag.toLowerCase().includes(term.toLowerCase()))
          ),
        },
      });
    }

    // Sort by similarity descending
    scored.sort((a, b) => b.score - a.score);

    const total = scored.length;
    const paged = scored.slice(offset, offset + limit).map(s => s.result);

    return { results: paged, total };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Check if a result matches the given filters
   */
  private matchesFilters(result: SearchResult, filters: SearchFilters): boolean {
    if (filters.tags && filters.tags.length > 0) {
      const hasTag = filters.tags.some(ft =>
        result.tags.some(rt => rt.toLowerCase().includes(ft.toLowerCase()))
      );
      if (!hasTag) return false;
    }

    if (filters.favoritesOnly) {
      // Would check favorites flag - for now pass through
    }

    if (filters.dateRange) {
      const created = result.metadata.createdAt;
      if (created < filters.dateRange.start || created > filters.dateRange.end) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate search suggestions based on query and results
   */
  private async generateSuggestions(
    query: string,
    analysis: SemanticAnalysis,
    _results: SearchResult[]
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Add suggestions based on detected concepts
    if (analysis.concepts.length > 0) {
      suggestions.push(`More ${analysis.concepts[0]} photos`);
    }

    // Add suggestions based on entities
    if (analysis.entities.length > 0) {
      suggestions.push(`Photos with ${analysis.entities[0]}`);
    }

    // Add time-based suggestions
    if (!analysis.temporalContext) {
      suggestions.push('Photos from last month');
      suggestions.push('Recent uploads');
    }

    // Add location-based suggestions if applicable
    if (analysis.spatialContext?.location) {
      suggestions.push(`Near ${analysis.spatialContext.location}`);
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Record search to history
   */
  private async recordSearchHistory(
    userId: string,
    query: string,
    resultCount: number,
    filters?: SearchFilters
  ): Promise<void> {
    const history = this.searchHistory.get(userId) || [];

    const item: SearchHistoryItem = {
      id: `search_${Date.now()}`,
      query,
      timestamp: new Date(),
      resultCount,
      filters,
    };

    history.unshift(item);

    // Keep only recent searches
    if (history.length > this.MAX_HISTORY_PER_USER) {
      history.pop();
    }

    this.searchHistory.set(userId, history);
  }

  /**
   * Get user's search history
   */
  async getSearchHistory(userId: string, limit: number = 20): Promise<SearchHistoryItem[]> {
    const history = this.searchHistory.get(userId) || [];
    return history.slice(0, limit);
  }

  /**
   * Clear user's search history
   */
  async clearSearchHistory(userId: string): Promise<void> {
    this.searchHistory.delete(userId);
  }

  /**
   * Get popular searches (across all users)
   */
  async getPopularSearches(limit: number = 10): Promise<{ query: string; count: number }[]> {
    const queryCounts = new Map<string, number>();

    for (const [, history] of this.searchHistory) {
      for (const item of history) {
        const count = queryCounts.get(item.query) || 0;
        queryCounts.set(item.query, count + 1);
      }
    }

    return Array.from(queryCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

// Singleton instance
let serviceInstance: ImageSemanticSearchService | null = null;

export function getImageSemanticSearchService(llmService: LLMService): ImageSemanticSearchService {
  if (!serviceInstance) {
    serviceInstance = new ImageSemanticSearchService(llmService);
  }
  return serviceInstance;
}
