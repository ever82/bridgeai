"use strict";
/**
 * Agent Profile L1, L2, L3 Data Models
 * L1: 基础信息（系统可查询的结构化数据）
 * L2: 结构化信息（Agent可读的自然语言）
 * L3: 自然语言描述（完整描述）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EDUCATION_LABELS = exports.GENDER_LABELS = exports.AGE_RANGE_LABELS = exports.L1_FIELD_LABELS = exports.L1_FIELD_WEIGHTS = exports.EducationLevel = exports.Gender = exports.AgeRange = void 0;
// ============================================
// L1 - 基础信息（系统可查询）
// ============================================
var AgeRange;
(function (AgeRange) {
    AgeRange["UNDER_18"] = "UNDER_18";
    AgeRange["AGE_18_25"] = "AGE_18_25";
    AgeRange["AGE_26_30"] = "AGE_26_30";
    AgeRange["AGE_31_35"] = "AGE_31_35";
    AgeRange["AGE_36_40"] = "AGE_36_40";
    AgeRange["AGE_41_45"] = "AGE_41_45";
    AgeRange["AGE_46_50"] = "AGE_46_50";
    AgeRange["AGE_51_60"] = "AGE_51_60";
    AgeRange["OVER_60"] = "OVER_60";
})(AgeRange || (exports.AgeRange = AgeRange = {}));
var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
    Gender["OTHER"] = "OTHER";
    Gender["PREFER_NOT_TO_SAY"] = "PREFER_NOT_TO_SAY";
})(Gender || (exports.Gender = Gender = {}));
var EducationLevel;
(function (EducationLevel) {
    EducationLevel["HIGH_SCHOOL"] = "HIGH_SCHOOL";
    EducationLevel["ASSOCIATE"] = "ASSOCIATE";
    EducationLevel["BACHELOR"] = "BACHELOR";
    EducationLevel["MASTER"] = "MASTER";
    EducationLevel["DOCTORATE"] = "DOCTORATE";
    EducationLevel["OTHER"] = "OTHER";
    EducationLevel["NO_REQUIREMENT"] = "NO_REQUIREMENT";
})(EducationLevel || (exports.EducationLevel = EducationLevel = {}));
// L1 field weights for completion calculation
exports.L1_FIELD_WEIGHTS = {
    age: 20,
    gender: 15,
    location: 25,
    occupation: 20,
    education: 20,
};
// L1 field labels for UI display
exports.L1_FIELD_LABELS = {
    age: '年龄段',
    gender: '性别',
    location: '所在地',
    occupation: '职业',
    education: '教育水平',
};
// Age range labels
exports.AGE_RANGE_LABELS = {
    [AgeRange.UNDER_18]: '18岁以下',
    [AgeRange.AGE_18_25]: '18-25岁',
    [AgeRange.AGE_26_30]: '26-30岁',
    [AgeRange.AGE_31_35]: '31-35岁',
    [AgeRange.AGE_36_40]: '36-40岁',
    [AgeRange.AGE_41_45]: '41-45岁',
    [AgeRange.AGE_46_50]: '46-50岁',
    [AgeRange.AGE_51_60]: '51-60岁',
    [AgeRange.OVER_60]: '60岁以上',
};
// Gender labels
exports.GENDER_LABELS = {
    [Gender.MALE]: '男',
    [Gender.FEMALE]: '女',
    [Gender.OTHER]: '其他',
    [Gender.PREFER_NOT_TO_SAY]: '保密',
};
// Education labels
exports.EDUCATION_LABELS = {
    [EducationLevel.HIGH_SCHOOL]: '高中及以下',
    [EducationLevel.ASSOCIATE]: '大专',
    [EducationLevel.BACHELOR]: '本科',
    [EducationLevel.MASTER]: '硕士',
    [EducationLevel.DOCTORATE]: '博士',
    [EducationLevel.OTHER]: '其他',
    [EducationLevel.NO_REQUIREMENT]: '不限',
};
//# sourceMappingURL=agentProfile.js.map