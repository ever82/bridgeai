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
  dateRange?: { start: Date; end: Date };
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
  topTags: { tag: string; count: number }[];
  recentAdditions: number;
}

/**
 * Favorite Service
 * Manages user favorites, collections, and related operations
 */
export class FavoriteService {
  private favorites: Map<string, Favorite> = new Map();
  private collections: Map<string, FavoriteCollection> = new Map();
  private userFavorites: Map<string, Set<string>> = new Map();
  private collectionFavorites: Map<string, Set<string>> = new Map();

  /**
   * Add an image to favorites
   */
  async addFavorite(
    userId: string,
    imageId: string,
    options?: {
      collectionId?: string;
      tags?: string[];
      note?: string;
    }
  ): Promise<Favorite> {
    const id = `fav_${userId}_${imageId}`;

    // Check if already favorited
    const existing = this.favorites.get(id);
    if (existing) {
      // Update existing
      const updated: Favorite = {
        ...existing,
        collectionId: options?.collectionId || existing.collectionId,
        tags: options?.tags || existing.tags,
        note: options?.note || existing.note,
        updatedAt: new Date()
      };
      this.favorites.set(id, updated);
      return updated;
    }

    const favorite: Favorite = {
      id,
      userId,
      imageId,
      collectionId: options?.collectionId,
      tags: options?.tags || [],
      note: options?.note,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.favorites.set(id, favorite);

    // Track user's favorites
    const userSet = this.userFavorites.get(userId) || new Set();
    userSet.add(id);
    this.userFavorites.set(userId, userSet);

    // Track collection favorites
    if (options?.collectionId) {
      const collSet = this.collectionFavorites.get(options.collectionId) || new Set();
      collSet.add(id);
      this.collectionFavorites.set(options.collectionId, collSet);

      // Update collection count
      const collection = this.collections.get(options.collectionId);
      if (collection) {
        collection.itemCount = collSet.size;
        collection.updatedAt = new Date();
      }
    }

    return favorite;
  }

  /**
   * Remove from favorites
   */
  async removeFavorite(userId: string, imageId: string): Promise<boolean> {
    const id = `fav_${userId}_${imageId}`;
    const favorite = this.favorites.get(id);

    if (!favorite) return false;

    this.favorites.delete(id);

    // Remove from user's favorites
    const userSet = this.userFavorites.get(userId);
    if (userSet) {
      userSet.delete(id);
    }

    // Remove from collection
    if (favorite.collectionId) {
      const collSet = this.collectionFavorites.get(favorite.collectionId);
      if (collSet) {
        collSet.delete(id);
      }

      // Update collection count
      const collection = this.collections.get(favorite.collectionId);
      if (collection) {
        collection.itemCount = collSet?.size || 0;
        collection.updatedAt = new Date();
      }
    }

    return true;
  }

  /**
   * Check if image is favorited
   */
  async isFavorite(userId: string, imageId: string): Promise<boolean> {
    const id = `fav_${userId}_${imageId}`;
    return this.favorites.has(id);
  }

  /**
   * Get user's favorites with optional filtering
   */
  async getFavorites(
    userId: string,
    filter?: FavoriteFilter,
    options?: { limit?: number; offset?: number }
  ): Promise<{ favorites: Favorite[]; total: number }> {
    const userFavIds = this.userFavorites.get(userId) || new Set();
    let favorites: Favorite[] = [];

    for (const id of userFavIds) {
      const fav = this.favorites.get(id);
      if (fav) {
        favorites.push(fav);
      }
    }

    // Apply filters
    if (filter) {
      favorites = this.applyFilters(favorites, filter);
    }

    // Sort by updatedAt desc
    favorites.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const total = favorites.length;

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    favorites = favorites.slice(offset, offset + limit);

    return { favorites, total };
  }

  /**
   * Apply filters to favorites
   */
  private applyFilters(favorites: Favorite[], filter: FavoriteFilter): Favorite[] {
    return favorites.filter(fav => {
      // Collection filter
      if (filter.collectionId && fav.collectionId !== filter.collectionId) {
        return false;
      }

      // Tags filter
      if (filter.tags && filter.tags.length > 0) {
        const hasTag = filter.tags.some(tag => fav.tags.includes(tag));
        if (!hasTag) return false;
      }

      // Date range filter
      if (filter.dateRange) {
        if (
          fav.createdAt < filter.dateRange.start ||
          fav.createdAt > filter.dateRange.end
        ) {
          return false;
        }
      }

      // Search query filter (on tags and note)
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const matchesTags = fav.tags.some(tag => tag.toLowerCase().includes(query));
        const matchesNote = fav.note?.toLowerCase().includes(query) || false;
        if (!matchesTags && !matchesNote) return false;
      }

      return true;
    });
  }

  /**
   * Create a collection
   */
  async createCollection(
    userId: string,
    name: string,
    description?: string
  ): Promise<FavoriteCollection> {
    const collection: FavoriteCollection = {
      id: `coll_${userId}_${Date.now()}`,
      userId,
      name,
      description,
      itemCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.collections.set(collection.id, collection);
    return collection;
  }

  /**
   * Update collection
   */
  async updateCollection(
    collectionId: string,
    updates: Partial<Pick<FavoriteCollection, 'name' | 'description' | 'coverImageId'>>
  ): Promise<FavoriteCollection | null> {
    const collection = this.collections.get(collectionId);
    if (!collection) return null;

    const updated: FavoriteCollection = {
      ...collection,
      ...updates,
      updatedAt: new Date()
    };

    this.collections.set(collectionId, updated);
    return updated;
  }

  /**
   * Delete collection
   */
  async deleteCollection(collectionId: string): Promise<boolean> {
    const collection = this.collections.get(collectionId);
    if (!collection) return false;

    // Remove collection from all favorites
    const favIds = this.collectionFavorites.get(collectionId) || new Set();
    for (const favId of favIds) {
      const fav = this.favorites.get(favId);
      if (fav) {
        fav.collectionId = undefined;
      }
    }

    this.collectionFavorites.delete(collectionId);
    this.collections.delete(collectionId);

    return true;
  }

  /**
   * Get user's collections
   */
  async getCollections(userId: string): Promise<FavoriteCollection[]> {
    const collections: FavoriteCollection[] = [];

    for (const [, coll] of this.collections) {
      if (coll.userId === userId) {
        collections.push(coll);
      }
    }

    // Sort by updatedAt desc
    return collections.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Move favorite to collection
   */
  async moveToCollection(
    favoriteId: string,
    collectionId: string | null
  ): Promise<Favorite | null> {
    const favorite = this.favorites.get(favoriteId);
    if (!favorite) return null;

    const oldCollectionId = favorite.collectionId;

    // Remove from old collection
    if (oldCollectionId) {
      const oldSet = this.collectionFavorites.get(oldCollectionId);
      if (oldSet) {
        oldSet.delete(favoriteId);
      }
      const oldColl = this.collections.get(oldCollectionId);
      if (oldColl) {
        oldColl.itemCount = oldSet?.size || 0;
        oldColl.updatedAt = new Date();
      }
    }

    // Add to new collection
    if (collectionId) {
      const newSet = this.collectionFavorites.get(collectionId) || new Set();
      newSet.add(favoriteId);
      this.collectionFavorites.set(collectionId, newSet);

      const newColl = this.collections.get(collectionId);
      if (newColl) {
        newColl.itemCount = newSet.size;
        newColl.updatedAt = new Date();
      }
    }

    favorite.collectionId = collectionId || undefined;
    favorite.updatedAt = new Date();

    return favorite;
  }

  /**
   * Add tags to favorite
   */
  async addTags(favoriteId: string, tags: string[]): Promise<Favorite | null> {
    const favorite = this.favorites.get(favoriteId);
    if (!favorite) return null;

    const newTags = [...new Set([...favorite.tags, ...tags])];
    favorite.tags = newTags;
    favorite.updatedAt = new Date();

    return favorite;
  }

  /**
   * Remove tags from favorite
   */
  async removeTags(favoriteId: string, tags: string[]): Promise<Favorite | null> {
    const favorite = this.favorites.get(favoriteId);
    if (!favorite) return null;

    favorite.tags = favorite.tags.filter(tag => !tags.includes(tag));
    favorite.updatedAt = new Date();

    return favorite;
  }

  /**
   * Update note
   */
  async updateNote(favoriteId: string, note: string): Promise<Favorite | null> {
    const favorite = this.favorites.get(favoriteId);
    if (!favorite) return null;

    favorite.note = note;
    favorite.updatedAt = new Date();

    return favorite;
  }

  /**
   * Search favorites
   */
  async searchFavorites(
    userId: string,
    query: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ favorites: Favorite[]; total: number }> {
    return this.getFavorites(
      userId,
      { searchQuery: query },
      options
    );
  }

  /**
   * Get favorite stats
   */
  async getStats(userId: string): Promise<FavoriteStats> {
    const userFavIds = this.userFavorites.get(userId) || new Set();
    const favorites: Favorite[] = [];

    for (const id of userFavIds) {
      const fav = this.favorites.get(id);
      if (fav) {
        favorites.push(fav);
      }
    }

    // Count tags
    const tagCounts = new Map<string, number>();
    favorites.forEach(fav => {
      fav.tags.forEach(tag => {
        const count = tagCounts.get(tag) || 0;
        tagCounts.set(tag, count + 1);
      });
    });

    // Get recent additions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAdditions = favorites.filter(fav => fav.createdAt >= thirtyDaysAgo).length;

    // Count user collections
    let collectionCount = 0;
    for (const [, coll] of this.collections) {
      if (coll.userId === userId) {
        collectionCount++;
      }
    }

    return {
      totalFavorites: favorites.length,
      totalCollections: collectionCount,
      topTags: Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      recentAdditions
    };
  }

  /**
   * Quick favorite toggle (add/remove)
   */
  async toggleFavorite(userId: string, imageId: string): Promise<{ isFavorite: boolean; favorite?: Favorite }> {
    const isFav = await this.isFavorite(userId, imageId);

    if (isFav) {
      await this.removeFavorite(userId, imageId);
      return { isFavorite: false };
    } else {
      const favorite = await this.addFavorite(userId, imageId);
      return { isFavorite: true, favorite };
    }
  }
}

// Singleton instance
let serviceInstance: FavoriteService | null = null;

export function getFavoriteService(): FavoriteService {
  if (!serviceInstance) {
    serviceInstance = new FavoriteService();
  }
  return serviceInstance;
}
