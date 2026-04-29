/**
 * 信用分系统类型定义
 */
// 信用等级
export var CreditLevel;
(function (CreditLevel) {
    CreditLevel["EXCELLENT"] = "excellent";
    CreditLevel["GOOD"] = "good";
    CreditLevel["GENERAL"] = "general";
    CreditLevel["POOR"] = "poor";
})(CreditLevel || (CreditLevel = {}));
// 信用分维度类型
export var CreditFactorType;
(function (CreditFactorType) {
    CreditFactorType["PROFILE"] = "profile";
    CreditFactorType["BEHAVIOR"] = "behavior";
    CreditFactorType["TRANSACTION"] = "transaction";
    CreditFactorType["SOCIAL"] = "social";
})(CreditFactorType || (CreditFactorType = {}));
// 信用分变化来源类型
export var CreditSourceType;
(function (CreditSourceType) {
    CreditSourceType["PROFILE_UPDATE"] = "profile_update";
    CreditSourceType["TRANSACTION"] = "transaction";
    CreditSourceType["RATING"] = "rating";
    CreditSourceType["SCHEDULED"] = "scheduled";
    CreditSourceType["COMPLAINT"] = "complaint";
    CreditSourceType["SYSTEM"] = "system";
})(CreditSourceType || (CreditSourceType = {}));
//# sourceMappingURL=credit.js.map