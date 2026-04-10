/**
 * Tests for input sanitizer utility
 */
import {
  escapeHtml,
  unescapeHtml,
  stripHtml,
  sanitizeHtml,
  sanitizeJavaScript,
  escapeSql,
  containsSqlInjection,
  containsNoSqlOperators,
  sanitizeNoSqlOperators,
  removeControlChars,
  normalizeWhitespace,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeInputString,
  sanitizeInputObject,
} from '../inputSanitizer';

describe('Input Sanitizer', () => {
  describe('escapeHtml', () => {
    it('should escape < to &lt;', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('should escape > to &gt;', () => {
      expect(escapeHtml('>')).toBe('&gt;');
    });

    it('should escape & to &amp;', () => {
      expect(escapeHtml('AT&T')).toBe('AT&amp;T');
    });

    it('should escape " to &quot;', () => {
      expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    });

    it('should escape \' to &#x27;', () => {
      expect(escapeHtml("'test'")).toBe('&#x27;test&#x27;');
    });

    it('should escape / to &#x2F;', () => {
      expect(escapeHtml('</script>')).toBe('&lt;&#x2F;script&gt;');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle string without special chars', () => {
      expect(escapeHtml('hello world')).toBe('hello world');
    });
  });

  describe('unescapeHtml', () => {
    it('should unescape &lt; to <', () => {
      expect(unescapeHtml('&lt;script&gt;')).toBe('<script>');
    });

    it('should unescape &amp; to &', () => {
      expect(unescapeHtml('AT&amp;T')).toBe('AT&T');
    });

    it('should unescape &quot; to "', () => {
      expect(unescapeHtml('&quot;hello&quot;')).toBe('"hello"');
    });

    it('should handle empty string', () => {
      expect(unescapeHtml('')).toBe('');
    });

    it('should handle string without entities', () => {
      expect(unescapeHtml('hello world')).toBe('hello world');
    });
  });

  describe('stripHtml', () => {
    it('should remove all HTML tags', () => {
      expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });

    it('should handle nested tags', () => {
      expect(stripHtml('<div><p>Text</p></div>')).toBe('Text');
    });

    it('should handle empty tags', () => {
      expect(stripHtml('<br/>')).toBe('');
    });

    it('should handle empty string', () => {
      expect(stripHtml('')).toBe('');
    });

    it('should handle string without tags', () => {
      expect(stripHtml('plain text')).toBe('plain text');
    });
  });

  describe('sanitizeHtml', () => {
    it('should allow specified tags', () => {
      expect(sanitizeHtml('<b>bold</b> <i>italic</i>', ['b', 'i'])).toBe('<b>bold</b> <i>italic</i>');
    });

    it('should escape disallowed tags', () => {
      expect(sanitizeHtml('<script>alert(1)</script> <b>safe</b>', ['b'])).toBe(
        '&lt;script&gt;alert(1)&lt;/script&gt; <b>safe</b>'
      );
    });

    it('should strip all tags when no allowed tags', () => {
      expect(sanitizeHtml('<b>text</b>')).toBe('text');
    });

    it('should handle empty string', () => {
      expect(sanitizeHtml('')).toBe('');
    });
  });

  describe('sanitizeJavaScript', () => {
    it('should remove javascript: protocol', () => {
      expect(sanitizeJavaScript('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should remove data: protocol', () => {
      expect(sanitizeJavaScript('data:text/html,<script>')).toBe('text/html,<script>');
    });

    it('should remove vbscript: protocol', () => {
      expect(sanitizeJavaScript('vbscript:msgbox(1)')).toBe('msgbox(1)');
    });

    it('should remove event handlers', () => {
      expect(sanitizeJavaScript('<img onerror=alert(1)>')).toBe('<img >');
    });

    it('should remove expression:', () => {
      expect(sanitizeJavaScript('expression(alert(1))')).toBe('(alert(1))');
    });

    it('should handle case insensitively', () => {
      expect(sanitizeJavaScript('JavaScript:alert(1)')).toBe('alert(1)');
    });

    it('should handle empty string', () => {
      expect(sanitizeJavaScript('')).toBe('');
    });
  });

  describe('escapeSql', () => {
    it('should escape single quotes', () => {
      expect(escapeSql("it's")).toBe("it\\'s");
    });

    it('should escape double quotes', () => {
      expect(escapeSql('say "hello"')).toBe('say \\"hello\\"');
    });

    it('should escape backslashes', () => {
      expect(escapeSql('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should handle empty string', () => {
      expect(escapeSql('')).toBe('');
    });
  });

  describe('containsSqlInjection', () => {
    it('should detect UNION attack', () => {
      expect(containsSqlInjection("' UNION SELECT * FROM users")).toBe(true);
    });

    it('should detect comment attack', () => {
      expect(containsSqlInjection("1; DROP TABLE users--")).toBe(true);
    });

    it('should detect OR attack', () => {
      expect(containsSqlInjection("' OR '1'='1")).toBe(true);
    });

    it('should not flag safe content', () => {
      expect(containsSqlInjection('Hello World')).toBe(false);
    });

    it('should not flag normal SQL keywords', () => {
      expect(containsSqlInjection('Select a file')).toBe(false);
    });
  });

  describe('containsNoSqlOperators', () => {
    it('should detect $where operator', () => {
      expect(containsNoSqlOperators({ $where: 'this.password.length > 0' })).toBe(true);
    });

    it('should detect $ne operator', () => {
      expect(containsNoSqlOperators({ username: { $ne: null } })).toBe(true);
    });

    it('should detect nested operators', () => {
      expect(containsNoSqlOperators({ user: { $gt: '' } })).toBe(true);
    });

    it('should detect operators in arrays', () => {
      expect(containsNoSqlOperators([{ $exists: true }])).toBe(true);
    });

    it('should not flag safe content', () => {
      expect(containsNoSqlOperators({ name: 'John', age: 30 })).toBe(false);
    });

    it('should not flag strings starting with $', () => {
      expect(containsNoSqlOperators({ price: '$100' })).toBe(false);
    });
  });

  describe('sanitizeNoSqlOperators', () => {
    it('should remove $where operator', () => {
      const result = sanitizeNoSqlOperators({ $where: 'code', name: 'John' });
      expect(result).toEqual({ name: 'John' });
    });

    it('should remove nested operators', () => {
      const result = sanitizeNoSqlOperators({ user: { $ne: null }, id: 1 });
      expect(result).toEqual({ user: {}, id: 1 });
    });

    it('should keep safe properties', () => {
      const result = sanitizeNoSqlOperators({ name: 'John', age: 30 });
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should handle arrays', () => {
      const result = sanitizeNoSqlOperators([{ name: 'John' }, { $gt: '' }]);
      expect(result).toEqual([{ name: 'John' }, {}]);
    });
  });

  describe('removeControlChars', () => {
    it('should remove null bytes', () => {
      expect(removeControlChars('test\x00')).toBe('test');
    });

    it('should remove control characters', () => {
      expect(removeControlChars('test\x01\x02')).toBe('test');
    });

    it('should keep normal text', () => {
      expect(removeControlChars('Hello World')).toBe('Hello World');
    });
  });

  describe('normalizeWhitespace', () => {
    it('should collapse multiple spaces', () => {
      expect(normalizeWhitespace('hello    world')).toBe('hello world');
    });

    it('should collapse tabs and newlines', () => {
      expect(normalizeWhitespace('hello\t\tworld\n\n')).toBe('hello world');
    });

    it('should trim whitespace', () => {
      expect(normalizeWhitespace('  hello  ')).toBe('hello');
    });
  });

  describe('sanitizeEmail', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
    });

    it('should accept https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
    });

    it('should reject javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    });

    it('should reject data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>')).toBeNull();
    });

    it('should handle invalid URLs', () => {
      expect(sanitizeUrl('not a url')).toBeNull();
    });

    it('should allow custom protocols', () => {
      expect(sanitizeUrl('ftp://example.com', ['ftp:', 'http:', 'https:'])).toBe('ftp://example.com/');
    });
  });

  describe('sanitizeInputString', () => {
    it('should apply all sanitizations by default', () => {
      const result = sanitizeInputString('  <script>alert(1)</script>  ');
      expect(result).toBe('<script>alert(1)</script>');
    });

    it('should strip HTML when stripHtml is true', () => {
      const result = sanitizeInputString('<b>bold</b>', { stripHtml: true });
      expect(result).toBe('bold');
    });

    it('should escape HTML when escapeHtml is true', () => {
      const result = sanitizeInputString('<script>', { escapeHtml: true, sanitizeJs: false });
      expect(result).toBe('&lt;script&gt;');
    });

    it('should skip trim when trim is false', () => {
      const result = sanitizeInputString('  hello  ', { trim: false, sanitizeJs: false });
      expect(result).toBe('  hello  ');
    });
  });

  describe('sanitizeInputObject', () => {
    it('should sanitize string fields', () => {
      const result = sanitizeInputObject({
        name: '<script>test</script>',
        age: 30,
      });
      expect(result.name).toBe('<script>test</script>');
      expect(result.age).toBe(30);
    });

    it('should handle nested objects', () => {
      const result = sanitizeInputObject({
        user: {
          name: '  John  ',
        },
      });
      expect(result.user.name).toBe('John');
    });

    it('should handle arrays', () => {
      const result = sanitizeInputObject({
        tags: ['  tag1  ', '  tag2  '],
      });
      expect(result.tags).toEqual(['tag1', 'tag2']);
    });
  });
});
