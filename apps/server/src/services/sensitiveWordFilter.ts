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

import { prisma } from '../db/client';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SensitiveWordMatch {
  id: string;
  word: string;
  category: string | null;
  level: SensitiveLevel;
  replacement: string | null;
  matchStart: number;
  matchEnd: number;
  matchedText: string; // the actual text that was matched (may differ for regex)
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

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

interface CachedEntry {
  id: string;
  word: string;
  category: string | null;
  level: SensitiveLevel;
  replacement: string | null;
  /** Pre-compiled RegExp when the word has a custom regex field */
  compiledRegex: RegExp | null;
}

let wordCache: CachedEntry[] = [];
let lastLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

/**
 * Load all active sensitive words from the database into the in-memory cache.
 * Safe to call repeatedly -- subsequent calls are no-ops within CACHE_TTL_MS
 * unless `force` is true.
 */
export async function loadWordLibrary(force = false): Promise<void> {
  const now = Date.now();
  if (!force && wordCache.length > 0 && now - lastLoadedAt < CACHE_TTL_MS) {
    return; // cache is still fresh
  }

  const rows = await prisma.sensitiveWord.findMany({
    where: { isActive: true },
    orderBy: { word: 'asc' },
  });

  wordCache = rows.map((row) => ({
    id: row.id,
    word: row.word,
    category: row.category,
    level: row.level,
    replacement: row.replacement,
    compiledRegex: row.regex ? compileRegex(row.regex) : null,
  }));

  lastLoadedAt = Date.now();
  logger.info('Sensitive word library loaded', { count: wordCache.length });
}

/**
 * Force reload the word library from the database (admin action).
 */
export async function reloadLibrary(): Promise<number> {
  await loadWordLibrary(true);
  return wordCache.length;
}

/**
 * Return the number of cached entries (useful for health checks).
 */
export function getCachedWordCount(): number {
  return wordCache.length;
}

// ---------------------------------------------------------------------------
// Text checking & filtering
// ---------------------------------------------------------------------------

/**
 * Check text against all cached patterns and return every match with metadata.
 * This is the core matching function used by both `filterText` and the admin
 * `/check` endpoint.
 */
export async function checkText(text: string): Promise<SensitiveWordMatch[]> {
  await loadWordLibrary();

  const matches: SensitiveWordMatch[] = [];
  const lowerText = text.toLowerCase();

  for (const entry of wordCache) {
    if (entry.compiledRegex) {
      // Regex matching
      let match: RegExpExecArray | null;
      // Reset lastIndex in case the regex has the global flag
      entry.compiledRegex.lastIndex = 0;
      while ((match = entry.compiledRegex.exec(text)) !== null) {
        matches.push({
          id: entry.id,
          word: entry.word,
          category: entry.category,
          level: entry.level,
          replacement: entry.replacement,
          matchStart: match.index,
          matchEnd: match.index + match[0].length,
          matchedText: match[0],
        });
        // Prevent infinite loop on zero-length matches
        if (match[0].length === 0) {
          entry.compiledRegex.lastIndex++;
        }
      }
    } else {
      // Plain text matching (case-insensitive)
      let searchFrom = 0;
      const lowerWord = entry.word.toLowerCase();
      let pos: number;
      while ((pos = lowerText.indexOf(lowerWord, searchFrom)) !== -1) {
        matches.push({
          id: entry.id,
          word: entry.word,
          category: entry.category,
          level: entry.level,
          replacement: entry.replacement,
          matchStart: pos,
          matchEnd: pos + entry.word.length,
          matchedText: text.substring(pos, pos + entry.word.length),
        });
        searchFrom = pos + 1;
      }
    }
  }

  // Deduplicate overlapping matches (keep the longest match at each position)
  return deduplicateMatches(matches);
}

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
export async function filterText(text: string): Promise<FilterResult> {
  const matches = await checkText(text);

  const blockedMatches = matches.filter((m) => m.level === 'BLOCK');
  const replaceMatches = matches.filter((m) => m.level === 'REPLACE');
  const warningMatches = matches.filter((m) => m.level === 'WARNING');

  // If any BLOCK-level match exists, reject the message entirely
  if (blockedMatches.length > 0) {
    return {
      blocked: true,
      filteredText: null,
      matches,
      warnings: warningMatches,
    };
  }

  // Apply REPLACE-level substitutions (process from end to start to keep indexes valid)
  let filtered = text;
  const sortedReplacements = [...replaceMatches].sort((a, b) => b.matchStart - a.matchStart);
  for (const m of sortedReplacements) {
    const replacement = m.replacement || '***';
    filtered = filtered.substring(0, m.matchStart) + replacement + filtered.substring(m.matchEnd);
  }

  return {
    blocked: false,
    filteredText: filtered,
    matches,
    warnings: warningMatches,
  };
}

// ---------------------------------------------------------------------------
// Admin CRUD operations
// ---------------------------------------------------------------------------

/**
 * Add a new sensitive word to the library.
 */
export async function addWord(params: AddWordParams): Promise<SensitiveWord> {
  // Validate regex if provided
  if (params.regex) {
    compileRegex(params.regex); // throws on invalid pattern
  }

  const record = await prisma.sensitiveWord.create({
    data: {
      word: params.word,
      category: params.category,
      level: params.level || 'WARNING',
      replacement: params.replacement,
      regex: params.regex,
      createdBy: params.createdBy,
    },
  });

  // Invalidate cache so next check picks up the new word
  await loadWordLibrary(true);

  logger.info('Sensitive word added', { word: params.word, level: params.level });
  return record;
}

/**
 * Deactivate (soft-delete) a sensitive word.
 */
export async function removeWord(id: string): Promise<SensitiveWord> {
  const record = await prisma.sensitiveWord.update({
    where: { id },
    data: { isActive: false },
  });

  await loadWordLibrary(true);

  logger.info('Sensitive word deactivated', { id, word: record.word });
  return record;
}

/**
 * Update properties of an existing sensitive word.
 */
export async function updateWord(id: string, params: UpdateWordParams): Promise<SensitiveWord> {
  // Validate regex if provided
  if (params.regex) {
    compileRegex(params.regex); // throws on invalid pattern
  }

  const data: Record<string, unknown> = {};
  if (params.word !== undefined) data.word = params.word;
  if (params.category !== undefined) data.category = params.category;
  if (params.level !== undefined) data.level = params.level;
  if (params.isActive !== undefined) data.isActive = params.isActive;
  if (params.replacement !== undefined) data.replacement = params.replacement;
  if (params.regex !== undefined) data.regex = params.regex;

  const record = await prisma.sensitiveWord.update({
    where: { id },
    data,
  });

  await loadWordLibrary(true);

  logger.info('Sensitive word updated', { id });
  return record;
}

/**
 * List sensitive words with optional filters and pagination.
 */
export async function listWords(params: ListWordsParams = {}): Promise<{
  words: SensitiveWord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.category) where.category = params.category;
  if (params.level) where.level = params.level;
  if (params.isActive !== undefined) where.isActive = params.isActive;
  if (params.search) {
    where.word = { contains: params.search, mode: 'insensitive' };
  }

  const [words, total] = await Promise.all([
    prisma.sensitiveWord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.sensitiveWord.count({ where }),
  ]);

  return {
    words,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compile a regex string into a RegExp. Throws on invalid patterns.
 * Automatically adds the `gi` flags when no flags are provided.
 */
function compileRegex(pattern: string): RegExp {
  try {
    // If the pattern looks like /pattern/flags, extract them
    const match = pattern.match(/^\/(.+)\/([gimsuy]*)$/);
    if (match) {
      return new RegExp(match[1], match[2] || 'gi');
    }
    // Otherwise treat as a raw pattern with global + case-insensitive
    return new RegExp(pattern, 'gi');
  } catch (err) {
    throw new Error(`Invalid regex pattern "${pattern}": ${(err as Error).message}`);
  }
}

/**
 * Remove overlapping matches, keeping the longest match at each position.
 */
function deduplicateMatches(matches: SensitiveWordMatch[]): SensitiveWordMatch[] {
  if (matches.length <= 1) return matches;

  // Sort by matchStart ascending, then by length descending
  const sorted = [...matches].sort((a, b) => {
    if (a.matchStart !== b.matchStart) return a.matchStart - b.matchStart;
    return (b.matchEnd - b.matchStart) - (a.matchEnd - a.matchStart);
  });

  const result: SensitiveWordMatch[] = [];
  let lastEnd = -1;

  for (const m of sorted) {
    if (m.matchStart >= lastEnd) {
      result.push(m);
      lastEnd = m.matchEnd;
    } else if (m.matchEnd > lastEnd) {
      // Partially overlapping -- keep the longer one
      const prev = result[result.length - 1];
      if (prev && (m.matchEnd - m.matchStart) > (prev.matchEnd - prev.matchStart)) {
        result[result.length - 1] = m;
        lastEnd = m.matchEnd;
      }
    }
  }

  return result;
}
