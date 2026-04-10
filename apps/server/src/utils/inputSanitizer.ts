/**
 * Input Sanitizer Utility
 *
 * Provides functions for sanitizing user input to prevent XSS,
 * SQL injection, and other injection attacks.
 */

// ============================================================================
// HTML/XSS Sanitization
// ============================================================================

/**
 * Escape HTML special characters
 * This prevents XSS by converting special characters to their HTML entities
 */
export function escapeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return input.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * Unescape HTML entities back to their original characters
 */
export function unescapeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const htmlUnescapes: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
    '&#39;': "'",
  };

  return input.replace(/&(?:amp|lt|gt|quot|#x27|#x2F|#x60|#x3D|#39);/g, (entity) => htmlUnescapes[entity] || entity);
}

/**
 * Strip all HTML tags from a string
 */
export function stripHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize HTML by allowing only specific safe tags
 * @param input - The input string
 * @param allowedTags - Array of allowed tag names (e.g., ['b', 'i', 'em', 'strong'])
 */
export function sanitizeHtml(input: string, allowedTags: string[] = []): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  if (allowedTags.length === 0) {
    return stripHtml(input);
  }

  // Create regex pattern for allowed tags
  const allowedPattern = allowedTags.join('|');
  const regex = new RegExp(`<(?!\/?(${allowedPattern})[^>]*\/?>)`, 'gi');

  return input.replace(regex, '&lt;');
}

/**
 * Remove dangerous JavaScript protocol and event handlers
 */
export function sanitizeJavaScript(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol (can contain JS)
    .replace(/data:/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript:/gi, '')
    // Remove on* event handlers
    .replace(/on\w+\s*=/gi, '')
    // Remove expression: (IE CSS)
    .replace(/expression\s*\(/gi, '');
}

// ============================================================================
// SQL Injection Prevention
// ============================================================================

/**
 * Escape SQL string literals
 * Note: This is a basic implementation. Prefer parameterized queries!
 */
export function escapeSql(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\x00/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
}

/**
 * Check if string contains SQL injection patterns
 * This is a heuristic check - not foolproof!
 */
export function containsSqlInjection(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /UNION\s+SELECT/i,
    /INSERT\s+INTO/i,
    /DELETE\s+FROM/i,
    /DROP\s+TABLE/i,
    /ALTER\s+TABLE/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

// ============================================================================
// NoSQL Injection Prevention
// ============================================================================

/**
 * Check if object contains NoSQL operators (MongoDB-style)
 */
export function containsNoSqlOperators(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  if (Array.isArray(obj)) {
    return obj.some(containsNoSqlOperators);
  }

  for (const key of Object.keys(obj)) {
    // Check for MongoDB operators (starting with $)
    if (key.startsWith('$')) {
      return true;
    }

    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === 'object' && value !== null) {
      if (containsNoSqlOperators(value)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Remove NoSQL operators from object
 */
export function sanitizeNoSqlOperators<T extends Record<string, unknown>>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null
        ? sanitizeNoSqlOperators(item as Record<string, unknown>)
        : item
    ) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    // Skip keys starting with $ (MongoDB operators)
    if (key.startsWith('$')) {
      continue;
    }

    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeNoSqlOperators(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

// ============================================================================
// General Input Sanitization
// ============================================================================

/**
 * Trim whitespace from string
 */
export function trim(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  return input.trim();
}

/**
 * Remove null bytes and other control characters
 */
export function removeControlChars(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove null bytes and other dangerous control characters
  return input.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

/**
 * Normalize Unicode (NFC) to prevent homograph attacks
 */
export function normalizeUnicode(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.normalize('NFC');
}

/**
 * Remove excessive whitespace
 */
export function normalizeWhitespace(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.replace(/\s+/g, ' ').trim();
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.toLowerCase().trim();
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(input: string, allowedProtocols: string[] = ['http:', 'https:']): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  try {
    const url = new URL(input.trim());

    if (!allowedProtocols.includes(url.protocol)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

// ============================================================================
// Object Sanitization
// ============================================================================

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
export function sanitizeInputString(input: string, options: SanitizeOptions = {}): string {
  const {
    escapeHtml: shouldEscapeHtml = false,
    stripHtml: shouldStripHtml = false,
    trim: shouldTrim = true,
    removeControlChars: shouldRemoveControlChars = true,
    sanitizeJs: shouldSanitizeJs = true,
  } = options;

  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  if (shouldRemoveControlChars) {
    sanitized = removeControlChars(sanitized);
  }

  if (shouldSanitizeJs) {
    sanitized = sanitizeJavaScript(sanitized);
  }

  if (shouldStripHtml) {
    sanitized = stripHtml(sanitized);
  } else if (shouldEscapeHtml) {
    sanitized = escapeHtml(sanitized);
  }

  if (shouldTrim) {
    sanitized = sanitized.trim();
  }

  return sanitized;
}

/**
 * Recursively sanitize an object's string values
 */
export function sanitizeInputObject<T extends Record<string, unknown>>(obj: T, options: SanitizeOptions = {}): T {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];

    if (typeof value === 'string') {
      result[key] = sanitizeInputString(value, options);
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          typeof item === 'string'
            ? sanitizeInputString(item, options)
            : typeof item === 'object' && item !== null
              ? sanitizeInputObject(item as Record<string, unknown>, options)
              : item
        );
      } else {
        result[key] = sanitizeInputObject(value as Record<string, unknown>, options);
      }
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

// ============================================================================
// Export Defaults
// ============================================================================

export default {
  escapeHtml,
  unescapeHtml,
  stripHtml,
  sanitizeHtml,
  sanitizeJavaScript,
  escapeSql,
  containsSqlInjection,
  containsNoSqlOperators,
  sanitizeNoSqlOperators,
  trim,
  removeControlChars,
  normalizeUnicode,
  normalizeWhitespace,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeInputObject,
  sanitizeInputString,
};
