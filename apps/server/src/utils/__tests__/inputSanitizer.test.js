"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Tests for input sanitizer utility
 */
const inputSanitizer_1 = require("../inputSanitizer");
describe('Input Sanitizer', () => {
    describe('escapeHtml', () => {
        it('should escape < to &lt;', () => {
            expect((0, inputSanitizer_1.escapeHtml)('<script>')).toBe('&lt;script&gt;');
        });
        it('should escape > to &gt;', () => {
            expect((0, inputSanitizer_1.escapeHtml)('>')).toBe('&gt;');
        });
        it('should escape & to &amp;', () => {
            expect((0, inputSanitizer_1.escapeHtml)('AT&T')).toBe('AT&amp;T');
        });
        it('should escape " to &quot;', () => {
            expect((0, inputSanitizer_1.escapeHtml)('"hello"')).toBe('&quot;hello&quot;');
        });
        it('should escape \' to &#x27;', () => {
            expect((0, inputSanitizer_1.escapeHtml)("'test'")).toBe('&#x27;test&#x27;');
        });
        it('should escape / to &#x2F;', () => {
            expect((0, inputSanitizer_1.escapeHtml)('</script>')).toBe('&lt;&#x2F;script&gt;');
        });
        it('should handle empty string', () => {
            expect((0, inputSanitizer_1.escapeHtml)('')).toBe('');
        });
        it('should handle string without special chars', () => {
            expect((0, inputSanitizer_1.escapeHtml)('hello world')).toBe('hello world');
        });
    });
    describe('unescapeHtml', () => {
        it('should unescape &lt; to <', () => {
            expect((0, inputSanitizer_1.unescapeHtml)('&lt;script&gt;')).toBe('<script>');
        });
        it('should unescape &amp; to &', () => {
            expect((0, inputSanitizer_1.unescapeHtml)('AT&amp;T')).toBe('AT&T');
        });
        it('should unescape &quot; to "', () => {
            expect((0, inputSanitizer_1.unescapeHtml)('&quot;hello&quot;')).toBe('"hello"');
        });
        it('should handle empty string', () => {
            expect((0, inputSanitizer_1.unescapeHtml)('')).toBe('');
        });
        it('should handle string without entities', () => {
            expect((0, inputSanitizer_1.unescapeHtml)('hello world')).toBe('hello world');
        });
    });
    describe('stripHtml', () => {
        it('should remove all HTML tags', () => {
            expect((0, inputSanitizer_1.stripHtml)('<p>Hello <b>World</b></p>')).toBe('Hello World');
        });
        it('should handle nested tags', () => {
            expect((0, inputSanitizer_1.stripHtml)('<div><p>Text</p></div>')).toBe('Text');
        });
        it('should handle empty tags', () => {
            expect((0, inputSanitizer_1.stripHtml)('<br/>')).toBe('');
        });
        it('should handle empty string', () => {
            expect((0, inputSanitizer_1.stripHtml)('')).toBe('');
        });
        it('should handle string without tags', () => {
            expect((0, inputSanitizer_1.stripHtml)('plain text')).toBe('plain text');
        });
    });
    describe('sanitizeHtml', () => {
        it('should allow specified tags', () => {
            expect((0, inputSanitizer_1.sanitizeHtml)('<b>bold</b> <i>italic</i>', ['b', 'i'])).toBe('<b>bold</b> <i>italic</i>');
        });
        it('should escape disallowed tags', () => {
            expect((0, inputSanitizer_1.sanitizeHtml)('<script>alert(1)</script> <b>safe</b>', ['b'])).toBe('&lt;script&gt;alert(1)&lt;/script&gt; <b>safe</b>');
        });
        it('should strip all tags when no allowed tags', () => {
            expect((0, inputSanitizer_1.sanitizeHtml)('<b>text</b>')).toBe('text');
        });
        it('should handle empty string', () => {
            expect((0, inputSanitizer_1.sanitizeHtml)('')).toBe('');
        });
    });
    describe('sanitizeJavaScript', () => {
        it('should remove javascript: protocol', () => {
            expect((0, inputSanitizer_1.sanitizeJavaScript)('javascript:alert(1)')).toBe('alert(1)');
        });
        it('should remove data: protocol', () => {
            expect((0, inputSanitizer_1.sanitizeJavaScript)('data:text/html,<script>')).toBe('text/html,<script>');
        });
        it('should remove vbscript: protocol', () => {
            expect((0, inputSanitizer_1.sanitizeJavaScript)('vbscript:msgbox(1)')).toBe('msgbox(1)');
        });
        it('should remove event handlers', () => {
            expect((0, inputSanitizer_1.sanitizeJavaScript)('<img onerror=alert(1)>')).toBe('<img >');
        });
        it('should remove expression:', () => {
            expect((0, inputSanitizer_1.sanitizeJavaScript)('expression(alert(1))')).toBe('(alert(1))');
        });
        it('should handle case insensitively', () => {
            expect((0, inputSanitizer_1.sanitizeJavaScript)('JavaScript:alert(1)')).toBe('alert(1)');
        });
        it('should handle empty string', () => {
            expect((0, inputSanitizer_1.sanitizeJavaScript)('')).toBe('');
        });
    });
    describe('escapeSql', () => {
        it('should escape single quotes', () => {
            expect((0, inputSanitizer_1.escapeSql)("it's")).toBe("it\\'s");
        });
        it('should escape double quotes', () => {
            expect((0, inputSanitizer_1.escapeSql)('say "hello"')).toBe('say \\"hello\\"');
        });
        it('should escape backslashes', () => {
            expect((0, inputSanitizer_1.escapeSql)('path\\to\\file')).toBe('path\\\\to\\\\file');
        });
        it('should handle empty string', () => {
            expect((0, inputSanitizer_1.escapeSql)('')).toBe('');
        });
    });
    describe('containsSqlInjection', () => {
        it('should detect UNION attack', () => {
            expect((0, inputSanitizer_1.containsSqlInjection)("' UNION SELECT * FROM users")).toBe(true);
        });
        it('should detect comment attack', () => {
            expect((0, inputSanitizer_1.containsSqlInjection)("1; DROP TABLE users--")).toBe(true);
        });
        it('should detect OR attack', () => {
            expect((0, inputSanitizer_1.containsSqlInjection)("' OR '1'='1")).toBe(true);
        });
        it('should not flag safe content', () => {
            expect((0, inputSanitizer_1.containsSqlInjection)('Hello World')).toBe(false);
        });
        it('should not flag normal SQL keywords', () => {
            expect((0, inputSanitizer_1.containsSqlInjection)('Select a file')).toBe(false);
        });
    });
    describe('containsNoSqlOperators', () => {
        it('should detect $where operator', () => {
            expect((0, inputSanitizer_1.containsNoSqlOperators)({ $where: 'this.password.length > 0' })).toBe(true);
        });
        it('should detect $ne operator', () => {
            expect((0, inputSanitizer_1.containsNoSqlOperators)({ username: { $ne: null } })).toBe(true);
        });
        it('should detect nested operators', () => {
            expect((0, inputSanitizer_1.containsNoSqlOperators)({ user: { $gt: '' } })).toBe(true);
        });
        it('should detect operators in arrays', () => {
            expect((0, inputSanitizer_1.containsNoSqlOperators)([{ $exists: true }])).toBe(true);
        });
        it('should not flag safe content', () => {
            expect((0, inputSanitizer_1.containsNoSqlOperators)({ name: 'John', age: 30 })).toBe(false);
        });
        it('should not flag strings starting with $', () => {
            expect((0, inputSanitizer_1.containsNoSqlOperators)({ price: '$100' })).toBe(false);
        });
    });
    describe('sanitizeNoSqlOperators', () => {
        it('should remove $where operator', () => {
            const result = (0, inputSanitizer_1.sanitizeNoSqlOperators)({ $where: 'code', name: 'John' });
            expect(result).toEqual({ name: 'John' });
        });
        it('should remove nested operators', () => {
            const result = (0, inputSanitizer_1.sanitizeNoSqlOperators)({ user: { $ne: null }, id: 1 });
            expect(result).toEqual({ user: {}, id: 1 });
        });
        it('should keep safe properties', () => {
            const result = (0, inputSanitizer_1.sanitizeNoSqlOperators)({ name: 'John', age: 30 });
            expect(result).toEqual({ name: 'John', age: 30 });
        });
        it('should handle arrays', () => {
            const result = (0, inputSanitizer_1.sanitizeNoSqlOperators)([{ name: 'John' }, { $gt: '' }]);
            expect(result).toEqual([{ name: 'John' }, {}]);
        });
    });
    describe('removeControlChars', () => {
        it('should remove null bytes', () => {
            expect((0, inputSanitizer_1.removeControlChars)('test\x00')).toBe('test');
        });
        it('should remove control characters', () => {
            expect((0, inputSanitizer_1.removeControlChars)('test\x01\x02')).toBe('test');
        });
        it('should keep normal text', () => {
            expect((0, inputSanitizer_1.removeControlChars)('Hello World')).toBe('Hello World');
        });
    });
    describe('normalizeWhitespace', () => {
        it('should collapse multiple spaces', () => {
            expect((0, inputSanitizer_1.normalizeWhitespace)('hello    world')).toBe('hello world');
        });
        it('should collapse tabs and newlines', () => {
            expect((0, inputSanitizer_1.normalizeWhitespace)('hello\t\tworld\n\n')).toBe('hello world');
        });
        it('should trim whitespace', () => {
            expect((0, inputSanitizer_1.normalizeWhitespace)('  hello  ')).toBe('hello');
        });
    });
    describe('sanitizeEmail', () => {
        it('should convert to lowercase', () => {
            expect((0, inputSanitizer_1.sanitizeEmail)('Test@Example.COM')).toBe('test@example.com');
        });
        it('should trim whitespace', () => {
            expect((0, inputSanitizer_1.sanitizeEmail)('  test@example.com  ')).toBe('test@example.com');
        });
    });
    describe('sanitizeUrl', () => {
        it('should accept http URLs', () => {
            expect((0, inputSanitizer_1.sanitizeUrl)('http://example.com')).toBe('http://example.com/');
        });
        it('should accept https URLs', () => {
            expect((0, inputSanitizer_1.sanitizeUrl)('https://example.com')).toBe('https://example.com/');
        });
        it('should reject javascript: URLs', () => {
            expect((0, inputSanitizer_1.sanitizeUrl)('javascript:alert(1)')).toBeNull();
        });
        it('should reject data: URLs', () => {
            expect((0, inputSanitizer_1.sanitizeUrl)('data:text/html,<script>')).toBeNull();
        });
        it('should handle invalid URLs', () => {
            expect((0, inputSanitizer_1.sanitizeUrl)('not a url')).toBeNull();
        });
        it('should allow custom protocols', () => {
            expect((0, inputSanitizer_1.sanitizeUrl)('ftp://example.com', ['ftp:', 'http:', 'https:'])).toBe('ftp://example.com/');
        });
    });
    describe('sanitizeInputString', () => {
        it('should apply all sanitizations by default', () => {
            const result = (0, inputSanitizer_1.sanitizeInputString)('  <script>alert(1)</script>  ');
            expect(result).toBe('<script>alert(1)</script>');
        });
        it('should strip HTML when stripHtml is true', () => {
            const result = (0, inputSanitizer_1.sanitizeInputString)('<b>bold</b>', { stripHtml: true });
            expect(result).toBe('bold');
        });
        it('should escape HTML when escapeHtml is true', () => {
            const result = (0, inputSanitizer_1.sanitizeInputString)('<script>', { escapeHtml: true, sanitizeJs: false });
            expect(result).toBe('&lt;script&gt;');
        });
        it('should skip trim when trim is false', () => {
            const result = (0, inputSanitizer_1.sanitizeInputString)('  hello  ', { trim: false, sanitizeJs: false });
            expect(result).toBe('  hello  ');
        });
    });
    describe('sanitizeInputObject', () => {
        it('should sanitize string fields', () => {
            const result = (0, inputSanitizer_1.sanitizeInputObject)({
                name: '<script>test</script>',
                age: 30,
            });
            expect(result.name).toBe('<script>test</script>');
            expect(result.age).toBe(30);
        });
        it('should handle nested objects', () => {
            const result = (0, inputSanitizer_1.sanitizeInputObject)({
                user: {
                    name: '  John  ',
                },
            });
            expect(result.user.name).toBe('John');
        });
        it('should handle arrays', () => {
            const result = (0, inputSanitizer_1.sanitizeInputObject)({
                tags: ['  tag1  ', '  tag2  '],
            });
            expect(result.tags).toEqual(['tag1', 'tag2']);
        });
    });
});
//# sourceMappingURL=inputSanitizer.test.js.map