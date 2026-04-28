/**
 * Saved Filter Service
 * 保存筛选器服务
 */
import { SavedFilter, SavedFilterInput } from '@bridgeai/shared';
/**
 * Create a saved filter
 */
export declare function createSavedFilter(userId: string, input: SavedFilterInput): Promise<SavedFilter>;
/**
 * Get saved filter by ID
 */
export declare function getSavedFilter(id: string, userId: string): Promise<SavedFilter | null>;
/**
 * Get all saved filters for a user
 */
export declare function getSavedFiltersByUser(userId: string, options?: {
    category?: string;
    includePublic?: boolean;
    page?: number;
    limit?: number;
}): Promise<{
    items: SavedFilter[];
    total: number;
}>;
/**
 * Update a saved filter
 */
export declare function updateSavedFilter(id: string, userId: string, input: Partial<SavedFilterInput>): Promise<SavedFilter | null>;
/**
 * Delete a saved filter
 */
export declare function deleteSavedFilter(id: string, userId: string): Promise<boolean>;
/**
 * Increment usage count
 */
export declare function incrementUsageCount(id: string): Promise<void>;
/**
 * Get popular saved filters
 */
export declare function getPopularSavedFilters(limit?: number): Promise<SavedFilter[]>;
/**
 * Share a saved filter
 */
export declare function shareSavedFilter(id: string, userId: string): Promise<string | null>;
/**
 * Duplicate a saved filter
 */
export declare function duplicateSavedFilter(id: string, userId: string, newName?: string): Promise<SavedFilter | null>;
//# sourceMappingURL=savedFilterService.d.ts.map