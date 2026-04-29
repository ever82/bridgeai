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
// ---------------------------------------------------------------------------
// Default sensitive words
// ---------------------------------------------------------------------------
/**
 * Default sensitive words seeded into the system.
 * These serve as a baseline; admins can add / remove words at runtime via
 * the sensitive-words management API.
 */
export const DEFAULT_SENSITIVE_WORDS = [
    // ---- Profanity / vulgarity (BLOCK) ----
    { word: '傻逼', category: 'profanity', level: 'BLOCK', replacement: '***' },
    { word: '他妈的', category: 'profanity', level: 'BLOCK', replacement: '***' },
    { word: '操', category: 'profanity', level: 'BLOCK', replacement: '***' },
    { word: '滚', category: 'profanity', level: 'BLOCK', replacement: '***' },
    { word: '去死', category: 'profanity', level: 'BLOCK', replacement: '***' },
    // ---- General negative / low quality (WARNING) ----
    { word: '垃圾', category: 'negative', level: 'WARNING' },
    { word: '骗子', category: 'scam', level: 'WARNING' },
    { word: '诈骗', category: 'scam', level: 'WARNING' },
    { word: '垃圾平台', category: 'negative', level: 'WARNING' },
    { word: '骗钱', category: 'scam', level: 'WARNING' },
    { word: '虚假宣传', category: 'scam', level: 'WARNING' },
    { word: '无良商家', category: 'negative', level: 'WARNING' },
    { word: '黑心', category: 'negative', level: 'WARNING' },
    // ---- Sexual content (BLOCK) ----
    { word: '色情', category: 'sexual', level: 'BLOCK', replacement: '***' },
    { word: '淫秽', category: 'sexual', level: 'BLOCK', replacement: '***' },
    { word: '黄色', category: 'sexual', level: 'REPLACE', replacement: '**' },
    { word: '裸体', category: 'sexual', level: 'BLOCK', replacement: '***' },
    { word: '性暗示', category: 'sexual', level: 'BLOCK', replacement: '***' },
    // ---- Harassment / threats (BLOCK) ----
    { word: '威胁', category: 'harassment', level: 'BLOCK', replacement: '***' },
    { word: '恐吓', category: 'harassment', level: 'BLOCK', replacement: '***' },
    { word: '骚扰', category: 'harassment', level: 'BLOCK', replacement: '***' },
    { word: '跟踪', category: 'harassment', level: 'BLOCK', replacement: '***' },
    // ---- Fraud (WARNING) ----
    { word: '假冒', category: 'scam', level: 'WARNING' },
    { word: '钓鱼', category: 'scam', level: 'WARNING' },
    // ---- Discrimination (BLOCK) ----
    { word: '歧视', category: 'discrimination', level: 'BLOCK', replacement: '***' },
    { word: '偏见', category: 'discrimination', level: 'REPLACE', replacement: '**' },
    { word: '种族主义', category: 'discrimination', level: 'BLOCK', replacement: '***' },
];
/**
 * Default regex patterns for detecting sensitive content that cannot be
 * expressed as simple word matches.
 */
export const DEFAULT_REGEX_PATTERNS = [
    // Phone number patterns (PII leak prevention - WARNING)
    {
        name: 'phone_number',
        pattern: '1[3-9]\\d{9}',
        category: 'pii',
        level: 'WARNING',
    },
    // ID card number (PII - BLOCK)
    {
        name: 'id_card',
        pattern: '\\d{17}[\\dXx]',
        category: 'pii',
        level: 'BLOCK',
        replacement: '****',
    },
    // WeChat ID pattern (common social media leak - WARNING)
    {
        name: 'wechat_id',
        pattern: '微信[号]?[:：]?\\s*[a-zA-Z0-9_-]{6,20}',
        category: 'pii',
        level: 'WARNING',
    },
];
/**
 * Supported sensitive word categories.
 */
export const SENSITIVE_WORD_CATEGORIES = [
    { key: 'profanity', label: '脏话/粗俗', description: '粗俗或冒犯性语言' },
    { key: 'negative', label: '负面评价', description: '低质量或负面评价用语' },
    { key: 'scam', label: '欺诈', description: '欺诈或诈骗相关用语' },
    { key: 'sexual', label: '色情低俗', description: '色情或低俗内容' },
    { key: 'harassment', label: '骚扰威胁', description: '骚扰或威胁性内容' },
    { key: 'discrimination', label: '歧视言论', description: '歧视或偏见性内容' },
    { key: 'pii', label: '隐私信息', description: '个人隐私信息泄露' },
    { key: 'political', label: '政治敏感', description: '政治敏感内容' },
    { key: 'advertising', label: '广告', description: '垃圾广告内容' },
];
// ---------------------------------------------------------------------------
// Filter behavior configuration
// ---------------------------------------------------------------------------
export const FILTER_CONFIG = {
    /** Default replacement text when none is specified */
    defaultReplacement: '***',
    /** Whether to log matched words for auditing */
    auditLogEnabled: true,
    /** Cache TTL in milliseconds for the in-memory word library */
    cacheTtlMs: 5 * 60 * 1000, // 5 minutes
    /** Maximum text length to check (characters) */
    maxTextLength: 10000,
};
//# sourceMappingURL=sensitiveWords.js.map