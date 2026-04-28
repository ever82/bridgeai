"use strict";
/**
 * 信用分系统共享类型
 * 供前后端共享使用
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditFactorType = exports.CREDIT_LEVEL_THRESHOLDS = exports.CreditLevelEnum = void 0;
// 信用等级枚举 (for backend use)
var CreditLevelEnum;
(function (CreditLevelEnum) {
    CreditLevelEnum["EXCELLENT"] = "excellent";
    CreditLevelEnum["GOOD"] = "good";
    CreditLevelEnum["GENERAL"] = "general";
    CreditLevelEnum["POOR"] = "poor";
})(CreditLevelEnum || (exports.CreditLevelEnum = CreditLevelEnum = {}));
// Credit level thresholds (used by mobile and server)
exports.CREDIT_LEVEL_THRESHOLDS = {
    excellent: { min: 900, max: 1000 },
    good: { min: 750, max: 899 },
    general: { min: 600, max: 749 },
    poor: { min: 0, max: 599 },
};
// 信用分维度类型
var CreditFactorType;
(function (CreditFactorType) {
    CreditFactorType["PROFILE"] = "profile";
    CreditFactorType["BEHAVIOR"] = "behavior";
    CreditFactorType["TRANSACTION"] = "transaction";
    CreditFactorType["SOCIAL"] = "social";
})(CreditFactorType || (exports.CreditFactorType = CreditFactorType = {}));
//# sourceMappingURL=credit.js.map