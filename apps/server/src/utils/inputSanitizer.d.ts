/**
 * Input Sanitizer Utility
 *
 * Provides functions for sanitizing user input to prevent XSS,
 * SQL injection, and other injection attacks.
 */
/**
 * Escape HTML special characters
 * This prevents XSS by converting special characters to their HTML entities
 */
export declare function escapeHtml(input: string): string;
/**
 * Unescape HTML entities back to their original characters
 */
export declare function unescapeHtml(input: string): string;
/**
 * Strip all HTML tags from a string
 */
export declare function stripHtml(input: string): string;
/**
 * Sanitize HTML by allowing only specific safe tags
 * @param input - The input string
 * @param allowedTags - Array of allowed tag names (e.g., ['b', 'i', 'em', 'strong'])
 */
export declare function sanitizeHtml(input: string, allowedTags?: string[]): string;
/**
 * Remove dangerous JavaScript protocol and event handlers
 */
export declare function sanitizeJavaScript(input: string): string;
/**
 * Escape SQL string literals
 * Note: This is a basic implementation. Prefer parameterized queries!
 */
export declare function escapeSql(input: string): string;
/**
 * Check if string contains SQL injection patterns
 * This is a heuristic check - not foolproof!
 */
export declare function containsSqlInjection(input: string): boolean;
/**
 * Check if object contains NoSQL operators (MongoDB-style)
 */
export declare function containsNoSqlOperators(obj: unknown): boolean;
/**
 * Remove NoSQL operators from object
 */
export declare function sanitizeNoSqlOperators<T extends Record<string, unknown>>(obj: T): T;
/**
 * Trim whitespace from string
 */
export declare function trim(input: string): string;
/**
 * Remove null bytes and other control characters
 */
export declare function removeControlChars(input: string): string;
/**
 * Normalize Unicode (NFC) to prevent homograph attacks
 */
export declare function normalizeUnicode(input: string): string;
/**
 * Remove excessive whitespace
 */
export declare function normalizeWhitespace(input: string): string;
/**
 * Sanitize email address
 */
export declare function sanitizeEmail(input: string): string;
/**
 * Sanitize URL
 */
export declare function sanitizeUrl(input: string, allowedProtocols?: string[]): string | null;
export interface SanitizeOptions {
    escapeHtml?: boolean;
    stripHtml?: boolean;
    trim?: boolean;
    removeControlChars?: boolean;
    sanitizeJs?: boolean;
}
/**
 * Sanitize a single string value
 */
export declare function sanitizeInputString(input: string, options?: SanitizeOptions): string;
/**
 * Recursively sanitize an object's string values
 */
export declare function sanitizeInputObject<T extends Record<string, unknown>>(obj: T, options?: SanitizeOptions): T;
declare const _default: {
    escapeHtml: typeof escapeHtml;
    unescapeHtml: typeof unescapeHtml;
    stripHtml: typeof stripHtml;
    sanitizeHtml: typeof sanitizeHtml;
    sanitizeJavaScript: typeof sanitizeJavaScript;
    escapeSql: typeof escapeSql;
    containsSqlInjection: typeof containsSqlInjection;
    containsNoSqlOperators: typeof containsNoSqlOperators;
    sanitizeNoSqlOperators: typeof sanitizeNoSqlOperators;
    trim: typeof trim;
    removeControlChars: typeof removeControlChars;
    normalizeUnicode: typeof normalizeUnicode;
    normalizeWhitespace: typeof normalizeWhitespace;
    sanitizeEmail: typeof sanitizeEmail;
    sanitizeUrl: typeof sanitizeUrl;
    sanitizeInputObject: typeof sanitizeInputObject;
    sanitizeInputString: typeof sanitizeInputString;
};
export default _default;
//# sourceMappingURL=inputSanitizer.d.ts.map