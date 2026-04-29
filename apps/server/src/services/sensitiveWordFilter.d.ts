/**
 * Sensitive Word Filter Service
 * 敏感词过滤服务
 *
 * Features:
 * - Manageable word library stored in database with in-memory cache
 * - Plain text matching AND regex pattern matching
 * - Graded blocking strategy: WARNING (allow with warning), REPLACE (replace text), BLOCK (block entirely)
 * - Admin CRUD operations for word library management
 * - On-demand or periodic cache reload
 */
import { SensitiveWord, SensitiveLevel } from '@prisma/client';
export interface SensitiveWordMatch {
    id: string;
    word: string;
    category: string | null;
    level: SensitiveLevel;
    replacement: string | null;
    matchStart: number;
    matchEnd: number;
    matchedText: string;
}
export interface FilterResult {
    /** true when at least one BLOCK-level word matched -- the message must be rejected */
    blocked: boolean;
    /** text after REPLACE-level substitutions have been applied (null when blocked) */
    filteredText: string | null;
    /** all matched words with their details */
    matches: SensitiveWordMatch[];
    /** convenience list of WARNING-level matches */
    warnings: SensitiveWordMatch[];
}
export interface AddWordParams {
    word: string;
    category?: string;
    level?: SensitiveLevel;
    replacement?: string;
    regex?: string;
    createdBy?: string;
}
export interface UpdateWordParams {
    word?: string;
    category?: string | null;
    level?: SensitiveLevel;
    isActive?: boolean;
    replacement?: string | null;
    regex?: string | null;
}
export interface ListWordsParams {
    category?: string;
    level?: SensitiveLevel;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}
/**
 * Load all active sensitive words from the database into the in-memory cache.
 * Safe to call repeatedly -- subsequent calls are no-ops within CACHE_TTL_MS
 * unless `force` is true.
 */
export declare function loadWordLibrary(force?: boolean): Promise<void>;
/**
 * Force reload the word library from the database (admin action).
 */
export declare function reloadLibrary(): Promise<number>;
/**
 * Return the number of cached entries (useful for health checks).
 */
export declare function getCachedWordCount(): number;
/**
 * Check text against all cached patterns and return every match with metadata.
 * This is the core matching function used by both `filterText` and the admin
 * `/check` endpoint.
 */
export declare function checkText(text: string): Promise<SensitiveWordMatch[]>;
/**
 * Apply graded filtering to the input text.
 *
 * - WARNING level matches: the text is returned as-is, but the matches are
 *   included in `warnings` so the caller can show a warning to the user.
 * - REPLACE level matches: matched words are replaced with the configured
 *   replacement text (defaults to `***`).
 * - BLOCK level matches: `filteredText` is set to `null` and `blocked` is
 *   `true`, signalling that the entire message should be rejected.
 */
export declare function filterText(text: string): Promise<FilterResult>;
/**
 * Add a new sensitive word to the library.
 */
export declare function addWord(params: AddWordParams): Promise<SensitiveWord>;
/**
 * Deactivate (soft-delete) a sensitive word.
 */
export declare function removeWord(id: string): Promise<SensitiveWord>;
/**
 * Update properties of an existing sensitive word.
 */
export declare function updateWord(id: string, params: UpdateWordParams): Promise<SensitiveWord>;
/**
 * List sensitive words with optional filters and pagination.
 */
export declare function listWords(params?: ListWordsParams): Promise<{
    words: SensitiveWord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}>;
//# sourceMappingURL=sensitiveWordFilter.d.ts.map