/**
 * Data Sanitizer
 * 数据脱敏工具
 *
 * 自动脱敏敏感信息：密码、Token、手机号、邮箱等
 */

// 脱敏规则类型
export type SanitizeRule = {
  pattern: RegExp;
  replacement: string;
};

// 默认脱敏规则
export const defaultSanitizeRules: SanitizeRule[] = [
  // 密码
  {
    pattern: /"password"\s*:\s*"[^"]*"/gi,
    replacement: '"password":"[REDACTED]"',
  },
  // Token
  {
    pattern: /"(token|accessToken|refreshToken)"\s*:\s*"[^"]*"/gi,
    replacement: '"$1":"[REDACTED]"',
  },
  // API Key
  {
    pattern: /"(apiKey|api_key|api-key)"\s*:\s*"[^"]*"/gi,
    replacement: '"$1":"[REDACTED]"',
  },
  // Authorization Header
  {
    pattern: /authorization\s*[=:]\s*["']?[^\s,"']*["']?/gi,
    replacement: 'authorization=[REDACTED]',
  },
  // 手机号 (11位，保留前3后4)
  {
    pattern: /(\d{3})\d{4}(\d{4})/g,
    replacement: '$1****$2',
  },
  // 邮箱 (保留@前后各2字符)
  {
    pattern: /([^\s@]{2})[^\s@]*(@[^\s@]{2})[^\s@]*/g,
    replacement: '$1***$2***',
  },
  // Cookie
  {
    pattern: /cookie\s*[=:]\s*["']?[^;,"']*["']?/gi,
    replacement: 'cookie=[REDACTED]',
  },
];

/**
 * 脱敏字符串
 * @param str 输入字符串
 * @param rules 脱敏规则
 * @returns 脱敏后的字符串
 */
export function sanitizeString(str: string, rules: SanitizeRule[] = defaultSanitizeRules): string {
  if (!str || typeof str !== 'string') {
    return str;
  }

  let result = str;
  for (const rule of rules) {
    result = result.replace(rule.pattern, rule.replacement);
  }
  return result;
}

/**
 * 脱敏对象
 * @param obj 输入对象
 * @param sensitiveFields 敏感字段列表
 * @returns 脱敏后的对象
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[] = ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'apiKey']
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result = { ...obj } as Record<string, unknown>;

  for (const key of Object.keys(result)) {
    const value = result[key];

    // 检查是否是敏感字段
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      result[key] = '[REDACTED]';
    }
    // 递归处理嵌套对象
    else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          typeof item === 'object' ? sanitizeObject(item as Record<string, unknown>, sensitiveFields) : item
        );
      } else {
        result[key] = sanitizeObject(value as Record<string, unknown>, sensitiveFields);
      }
    }
    // 处理字符串中的敏感信息
    else if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    }
  }

  return result as T;
}

/**
 * 脱敏请求/响应体
 * @param body 请求或响应体
 * @returns 脱敏后的数据
 */
export function sanitizeBody(body: unknown): unknown {
  if (!body) return body;

  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(sanitizeObject(parsed));
    } catch {
      return sanitizeString(body);
    }
  }

  if (typeof body === 'object') {
    return sanitizeObject(body as Record<string, unknown>);
  }

  return body;
}

/**
 * 脱敏 URL 查询参数
 * @param url URL 字符串
 * @returns 脱敏后的 URL
 */
export function sanitizeUrl(url: string): string {
  if (!url) return url;

  try {
    const urlObj = new URL(url);
    const sensitiveParams = ['token', 'apiKey', 'api_key', 'secret', 'password'];

    for (const param of sensitiveParams) {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    }

    return urlObj.toString();
  } catch {
    // 如果不是有效 URL，尝试正则脱敏
    return sanitizeString(url);
  }
}

/**
 * 脱敏 HTTP Header
 * @param headers HTTP 头对象
 * @returns 脱敏后的头对象
 */
export function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string | string[] | undefined> {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  const result = { ...headers };

  for (const key of Object.keys(result)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      const value = result[key];
      if (typeof value === 'string') {
        result[key] = '[REDACTED]';
      } else if (Array.isArray(value)) {
        result[key] = ['[REDACTED]'];
      }
    }
  }

  return result;
}

/**
 * 创建脱敏中间件用的函数
 * @returns 脱敏函数
 */
export function createSanitizer() {
  return {
    string: sanitizeString,
    object: sanitizeObject,
    body: sanitizeBody,
    url: sanitizeUrl,
    headers: sanitizeHeaders,
  };
}
