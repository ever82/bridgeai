/**
 * Sensitive Words Configuration
 * 敏感词配置
 *
 * Centralized default sensitive word library used by the sensitive word filter
 * service and other moderation services. Words are organized by category and
 * severity level (WARNING / REPLACE / BLOCK).
 *
 * For runtime management use the database-backed sensitiveWordFilter service
 * and the /api/v1/sensitive-words admin endpoints.
 */
export type SensitiveLevelConfig = 'WARNING' | 'REPLACE' | 'BLOCK';
export interface DefaultSensitiveWord {
    /** The word or phrase to match */
    word: string;
    /** Category for grouping (e.g. profanity, scam, harassment) */
    category: string;
    /** Graded blocking level */
    level: SensitiveLevelConfig;
    /** Replacement text when level is REPLACE (defaults to ***) */
    replacement?: string;
    /** Optional regex pattern for complex matching */
    regex?: string;
}
/**
 * Default sensitive words seeded into the system.
 * These serve as a baseline; admins can add / remove words at runtime via
 * the sensitive-words management API.
 */
export declare const DEFAULT_SENSITIVE_WORDS: readonly DefaultSensitiveWord[];
export interface DefaultRegexPattern {
    /** Human-readable name */
    name: string;
    /** Regex pattern string */
    pattern: string;
    /** Category */
    category: string;
    /** Graded blocking level */
    level: SensitiveLevelConfig;
    /** Replacement text when level is REPLACE */
    replacement?: string;
}
/**
 * Default regex patterns for detecting sensitive content that cannot be
 * expressed as simple word matches.
 */
export declare const DEFAULT_REGEX_PATTERNS: readonly DefaultRegexPattern[];
export interface SensitiveWordCategory {
    key: string;
    label: string;
    description: string;
}
/**
 * Supported sensitive word categories.
 */
export declare const SENSITIVE_WORD_CATEGORIES: readonly SensitiveWordCategory[];
export declare const FILTER_CONFIG: {
    /** Default replacement text when none is specified */
    readonly defaultReplacement: "***";
    /** Whether to log matched words for auditing */
    readonly auditLogEnabled: true;
    /** Cache TTL in milliseconds for the in-memory word library */
    readonly cacheTtlMs: number;
    /** Maximum text length to check (characters) */
    readonly maxTextLength: 10000;
};
//# sourceMappingURL=sensitiveWords.d.ts.map