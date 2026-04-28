/**
 * Favorite Service
 * Manages user favorites with collections, tags, and search
 */
export interface Favorite {
    id: string;
    userId: string;
    imageId: string;
    collectionId?: string;
    tags: string[];
    note?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface FavoriteCollection {
    id: string;
    userId: string;
    name: string;
    description?: string;
    coverImageId?: string;
    itemCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface FavoriteFilter {
    collectionId?: string;
    tags?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    searchQuery?: string;
}
export interface FavoriteSearchResult {
    favorite: Favorite;
    image?: {
        id: string;
        url: string;
        thumbnailUrl: string;
        title: string;
        tags: string[];
    };
}
export interface FavoriteStats {
    totalFavorites: number;
    totalCollections: number;
    topTags: {
        tag: string;
        count: number;
    }[];
    recentAdditions: number;
}
/**
 * Favorite Service
 * Manages user favorites, collections, and related operations
 */
export declare class FavoriteService {
    private favorites;
    private collections;
    private userFavorites;
    private collectionFavorites;
    /**
     * Add an image to favorites
     */
    addFavorite(userId: string, imageId: string, options?: {
        collectionId?: string;
        tags?: string[];
        note?: string;
    }): Promise<Favorite>;
    /**
     * Remove from favorites
     */
    removeFavorite(userId: string, imageId: string): Promise<boolean>;
    /**
     * Check if image is favorited
     */
    isFavorite(userId: string, imageId: string): Promise<boolean>;
    /**
     * Get user's favorites with optional filtering
     */
    getFavorites(userId: string, filter?: FavoriteFilter, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        favorites: Favorite[];
        total: number;
    }>;
    /**
     * Apply filters to favorites
     */
    private applyFilters;
    /**
     * Create a collection
     */
    createCollection(userId: string, name: string, description?: string): Promise<FavoriteCollection>;
    /**
     * Update collection
     */
    updateCollection(collectionId: string, updates: Partial<Pick<FavoriteCollection, 'name' | 'description' | 'coverImageId'>>): Promise<FavoriteCollection | null>;
    /**
     * Delete collection
     */
    deleteCollection(collectionId: string): Promise<boolean>;
    /**
     * Get user's collections
     */
    getCollections(userId: string): Promise<FavoriteCollection[]>;
    /**
     * Move favorite to collection
     */
    moveToCollection(favoriteId: string, collectionId: string | null): Promise<Favorite | null>;
    /**
     * Add tags to favorite
     */
    addTags(favoriteId: string, tags: string[]): Promise<Favorite | null>;
    /**
     * Remove tags from favorite
     */
    removeTags(favoriteId: string, tags: string[]): Promise<Favorite | null>;
    /**
     * Update note
     */
    updateNote(favoriteId: string, note: string): Promise<Favorite | null>;
    /**
     * Search favorites
     */
    searchFavorites(userId: string, query: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        favorites: Favorite[];
        total: number;
    }>;
    /**
     * Get favorite stats
     */
    getStats(userId: string): Promise<FavoriteStats>;
    /**
     * Quick favorite toggle (add/remove)
     */
    toggleFavorite(userId: string, imageId: string): Promise<{
        isFavorite: boolean;
        favorite?: Favorite;
    }>;
}
export declare function getFavoriteService(): FavoriteService;
//# sourceMappingURL=favoriteService.d.ts.map