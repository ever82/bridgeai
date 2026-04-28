/**
 * Image Semantic Search Service
 * AI-powered natural language image search with semantic matching
 */
import { LLMService } from './llmService';
export interface SearchQuery {
    query: string;
    userId: string;
    filters?: SearchFilters;
    limit?: number;
    offset?: number;
}
export interface SearchFilters {
    dateRange?: {
        start: Date;
        end: Date;
    };
    tags?: string[];
    location?: {
        lat: number;
        lng: number;
        radius: number;
    };
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
    location?: {
        lat: number;
        lng: number;
        name?: string;
    };
    camera?: string;
    dimensions?: {
        width: number;
        height: number;
    };
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
    temporalContext?: {
        start?: Date;
        end?: Date;
    };
    spatialContext?: {
        location?: string;
        near?: string;
    };
}
/**
 * Image Semantic Search Service
 */
export declare class ImageSemanticSearchService {
    private llmService;
    private searchHistory;
    private readonly MAX_HISTORY_PER_USER;
    private imageIndex;
    constructor(llmService: LLMService);
    /**
     * Index an image with its embedding for semantic search
     */
    indexImage(imageId: string, imageData: {
        url: string;
        thumbnailUrl: string;
        title?: string;
        description?: string;
        tags?: string[];
        metadata?: ImageMetadata;
    }): Promise<void>;
    /**
     * Remove an image from the search index
     */
    removeFromIndex(imageId: string): Promise<void>;
    /**
     * Get total indexed image count
     */
    getIndexSize(): number;
    /**
     * Perform semantic search with natural language query
     */
    search(query: SearchQuery): Promise<{
        results: SearchResult[];
        total: number;
        analysis: SemanticAnalysis;
        suggestions: string[];
    }>;
    /**
     * Analyze natural language query to extract semantics
     */
    private analyzeQuery;
    /**
     * Generate embedding for search query
     */
    private generateQueryEmbedding;
    /**
     * Execute search with filters using cosine similarity
     */
    private executeSearch;
    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity;
    /**
     * Check if a result matches the given filters
     */
    private matchesFilters;
    /**
     * Generate search suggestions based on query and results
     */
    private generateSuggestions;
    /**
     * Record search to history
     */
    private recordSearchHistory;
    /**
     * Get user's search history
     */
    getSearchHistory(userId: string, limit?: number): Promise<SearchHistoryItem[]>;
    /**
     * Clear user's search history
     */
    clearSearchHistory(userId: string): Promise<void>;
    /**
     * Get popular searches (across all users)
     */
    getPopularSearches(limit?: number): Promise<{
        query: string;
        count: number;
    }[]>;
}
export declare function getImageSemanticSearchService(llmService: LLMService): ImageSemanticSearchService;
//# sourceMappingURL=imageSemanticSearch.d.ts.map