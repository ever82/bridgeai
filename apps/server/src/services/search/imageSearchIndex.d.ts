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
export type TagCategory = 'object' | 'scene' | 'activity' | 'person' | 'animal' | 'nature' | 'architecture' | 'concept' | 'color' | 'time' | 'location' | 'event';
export interface IndexMetadata {
    description: string;
    colors: string[];
    objects: string[];
    scenes: string[];
    emotions: string[];
    quality: number;
    location?: {
        lat: number;
        lng: number;
        name?: string;
    };
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
    dateRange?: {
        start: Date;
        end: Date;
    };
    location?: {
        lat: number;
        lng: number;
        radius: number;
    };
    quality?: {
        min: number;
        max: number;
    };
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
export declare class ImageSearchIndexService {
    private indexes;
    private tagHierarchy;
    private userIndexes;
    constructor();
    /**
     * Initialize tag classification hierarchy
     */
    private initializeTagHierarchy;
    /**
     * Add or update an index
     */
    addIndex(index: SearchIndex): Promise<void>;
    /**
     * Search indexes with multi-dimensional matching
     */
    search(query: IndexQuery): Promise<{
        results: IndexResult[];
        total: number;
    }>;
    /**
     * Apply filters to candidates
     */
    private applyFilters;
    /**
     * Calculate relevance score for an index
     */
    private calculateScore;
    /**
     * Calculate tag matching score with hierarchy
     */
    private calculateTagScore;
    /**
     * Expand tags with hierarchical relationships
     */
    private expandTagsWithHierarchy;
    /**
     * Check if two tags match
     */
    private tagsMatch;
    /**
     * Calculate category matching score
     */
    private calculateCategoryScore;
    /**
     * Calculate cosine similarity between two vectors
     */
    private calculateCosineSimilarity;
    /**
     * Get matched tags for a result
     */
    private getMatchedTags;
    /**
     * Sort results based on criteria
     */
    private sortResults;
    /**
     * Calculate distance between two coordinates (haversine formula)
     */
    private calculateDistance;
    /**
     * Delete an index
     */
    deleteIndex(indexId: string): Promise<boolean>;
    /**
     * Get all tags in the hierarchy
     */
    getTagHierarchy(): Promise<TagHierarchy>;
    /**
     * Get popular tags for a user
     */
    getPopularTags(userId: string, limit?: number): Promise<{
        tag: string;
        count: number;
    }[]>;
    /**
     * Update index
     */
    updateIndex(indexId: string, updates: Partial<SearchIndex>): Promise<SearchIndex | null>;
}
export declare function getImageSearchIndexService(): ImageSearchIndexService;
//# sourceMappingURL=imageSearchIndex.d.ts.map