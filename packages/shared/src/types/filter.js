"use strict";
/**
 * Filter DSL Types
 * 过滤 DSL 类型定义
 *
 * Supports complex filtering with operators and logical combinations
 * 支持复杂过滤，包括操作符和逻辑组合
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPERATOR_METADATA = void 0;
exports.isFilterCondition = isFilterCondition;
exports.isAndFilter = isAndFilter;
exports.isOrFilter = isOrFilter;
exports.isNotFilter = isNotFilter;
// ============================================
// Utility Types
// ============================================
// Type guard functions
function isFilterCondition(expr) {
    return 'field' in expr && 'operator' in expr;
}
function isAndFilter(expr) {
    return 'and' in expr && Array.isArray(expr.and);
}
function isOrFilter(expr) {
    return 'or' in expr && Array.isArray(expr.or);
}
function isNotFilter(expr) {
    return 'not' in expr && !Array.isArray(expr.not);
}
// Operator metadata
exports.OPERATOR_METADATA = {
    eq: { label: '等于', description: 'Equal to' },
    ne: { label: '不等于', description: 'Not equal to' },
    gt: { label: '大于', description: 'Greater than' },
    gte: { label: '大于等于', description: 'Greater than or equal' },
    lt: { label: '小于', description: 'Less than' },
    lte: { label: '小于等于', description: 'Less than or equal' },
    in: { label: '包含于', description: 'In list' },
    nin: { label: '不包含于', description: 'Not in list' },
    contains: { label: '包含', description: 'Contains substring' },
    startsWith: { label: '以...开头', description: 'Starts with' },
    endsWith: { label: '以...结尾', description: 'Ends with' },
    exists: { label: '存在', description: 'Field exists' },
    regex: { label: '正则匹配', description: 'Matches pattern' },
};
//# sourceMappingURL=filter.js.map