"use strict";
/**
 * Dating Profile Types
 * Types for AgentDate dating profile configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VISIBILITY_LABELS = exports.DATING_PURPOSE_LABELS = exports.INCOME_LABELS = exports.DATING_EDUCATION_LABELS = exports.HEIGHT_RANGE_LABELS = exports.DATING_AGE_RANGE_LABELS = exports.VisibilityLevel = exports.FamilyPlan = exports.LivingArrangement = exports.RelationshipPace = exports.DatingPurpose = exports.DietPreference = exports.ExerciseFrequency = exports.PetPreference = exports.DrinkingHabit = exports.SmokingHabit = exports.SleepSchedule = exports.InterestCategory = exports.PersonalityTrait = exports.MBTIType = exports.IncomeRange = exports.EducationPreference = exports.HeightRange = exports.AgeRangePreference = void 0;
// ============================================
// Basic Conditions - 基础条件
// ============================================
var AgeRangePreference;
(function (AgeRangePreference) {
    AgeRangePreference["UNDER_20"] = "UNDER_20";
    AgeRangePreference["AGE_20_25"] = "AGE_20_25";
    AgeRangePreference["AGE_26_30"] = "AGE_26_30";
    AgeRangePreference["AGE_31_35"] = "AGE_31_35";
    AgeRangePreference["AGE_36_40"] = "AGE_36_40";
    AgeRangePreference["AGE_41_50"] = "AGE_41_50";
    AgeRangePreference["OVER_50"] = "OVER_50";
    AgeRangePreference["NO_PREFERENCE"] = "NO_PREFERENCE";
})(AgeRangePreference || (exports.AgeRangePreference = AgeRangePreference = {}));
var HeightRange;
(function (HeightRange) {
    HeightRange["BELOW_150"] = "BELOW_150";
    HeightRange["HEIGHT_150_160"] = "HEIGHT_150_160";
    HeightRange["HEIGHT_160_170"] = "HEIGHT_160_170";
    HeightRange["HEIGHT_170_180"] = "HEIGHT_170_180";
    HeightRange["HEIGHT_180_190"] = "HEIGHT_180_190";
    HeightRange["ABOVE_190"] = "ABOVE_190";
    HeightRange["NO_PREFERENCE"] = "NO_PREFERENCE";
})(HeightRange || (exports.HeightRange = HeightRange = {}));
var EducationPreference;
(function (EducationPreference) {
    EducationPreference["HIGH_SCHOOL"] = "HIGH_SCHOOL";
    EducationPreference["ASSOCIATE"] = "ASSOCIATE";
    EducationPreference["BACHELOR"] = "BACHELOR";
    EducationPreference["MASTER"] = "MASTER";
    EducationPreference["DOCTORATE"] = "DOCTORATE";
    EducationPreference["NO_PREFERENCE"] = "NO_PREFERENCE";
})(EducationPreference || (exports.EducationPreference = EducationPreference = {}));
var IncomeRange;
(function (IncomeRange) {
    IncomeRange["BELOW_5K"] = "BELOW_5K";
    IncomeRange["INCOME_5K_10K"] = "INCOME_5K_10K";
    IncomeRange["INCOME_10K_20K"] = "INCOME_10K_20K";
    IncomeRange["INCOME_20K_50K"] = "INCOME_20K_50K";
    IncomeRange["ABOVE_50K"] = "ABOVE_50K";
    IncomeRange["NO_PREFERENCE"] = "NO_PREFERENCE";
})(IncomeRange || (exports.IncomeRange = IncomeRange = {}));
// ============================================
// Personality Preferences - 性格偏好
// ============================================
var MBTIType;
(function (MBTIType) {
    MBTIType["INTJ"] = "INTJ";
    MBTIType["INTP"] = "INTP";
    MBTIType["ENTJ"] = "ENTJ";
    MBTIType["ENTP"] = "ENTP";
    MBTIType["INFJ"] = "INFJ";
    MBTIType["INFP"] = "INFP";
    MBTIType["ENFJ"] = "ENFJ";
    MBTIType["ENFP"] = "ENFP";
    MBTIType["ISTJ"] = "ISTJ";
    MBTIType["ISFJ"] = "ISFJ";
    MBTIType["ESTJ"] = "ESTJ";
    MBTIType["ESFJ"] = "ESFJ";
    MBTIType["ISTP"] = "ISTP";
    MBTIType["ISFP"] = "ISFP";
    MBTIType["ESTP"] = "ESTP";
    MBTIType["ESFP"] = "ESFP";
    MBTIType["NO_PREFERENCE"] = "NO_PREFERENCE";
})(MBTIType || (exports.MBTIType = MBTIType = {}));
var PersonalityTrait;
(function (PersonalityTrait) {
    PersonalityTrait["INTROVERTED"] = "INTROVERTED";
    PersonalityTrait["EXTROVERTED"] = "EXTROVERTED";
    PersonalityTrait["AMBIVERT"] = "AMBIVERT";
    PersonalityTrait["OPTIMISTIC"] = "OPTIMISTIC";
    PersonalityTrait["RATIONAL"] = "RATIONAL";
    PersonalityTrait["EMOTIONAL"] = "EMOTIONAL";
    PersonalityTrait["PRACTICAL"] = "PRACTICAL";
    PersonalityTrait["CREATIVE"] = "CREATIVE";
    PersonalityTrait["ADVENTUROUS"] = "ADVENTUROUS";
    PersonalityTrait["STABLE"] = "STABLE";
    PersonalityTrait["HUMOROUS"] = "HUMOROUS";
    PersonalityTrait["GENTLE"] = "GENTLE";
    PersonalityTrait["INDEPENDENT"] = "INDEPENDENT";
    PersonalityTrait["DEPENDABLE"] = "DEPENDABLE";
})(PersonalityTrait || (exports.PersonalityTrait = PersonalityTrait = {}));
// ============================================
// Interests - 兴趣爱好
// ============================================
var InterestCategory;
(function (InterestCategory) {
    InterestCategory["SPORTS"] = "SPORTS";
    InterestCategory["MUSIC"] = "MUSIC";
    InterestCategory["READING"] = "READING";
    InterestCategory["TRAVEL"] = "TRAVEL";
    InterestCategory["FOOD"] = "FOOD";
    InterestCategory["MOVIES"] = "MOVIES";
    InterestCategory["GAMING"] = "GAMING";
    InterestCategory["PHOTOGRAPHY"] = "PHOTOGRAPHY";
    InterestCategory["ARTS"] = "ARTS";
    InterestCategory["TECH"] = "TECH";
    InterestCategory["FASHION"] = "FASHION";
    InterestCategory["OUTDOOR"] = "OUTDOOR";
    InterestCategory["PETS"] = "PETS";
    InterestCategory["COOKING"] = "COOKING";
    InterestCategory["DANCING"] = "DANCING";
    InterestCategory["FITNESS"] = "FITNESS";
})(InterestCategory || (exports.InterestCategory = InterestCategory = {}));
// ============================================
// Lifestyle - 生活方式
// ============================================
var SleepSchedule;
(function (SleepSchedule) {
    SleepSchedule["EARLY_BIRD"] = "EARLY_BIRD";
    SleepSchedule["NIGHT_OWL"] = "NIGHT_OWL";
    SleepSchedule["FLEXIBLE"] = "FLEXIBLE";
    SleepSchedule["REGULAR"] = "REGULAR";
})(SleepSchedule || (exports.SleepSchedule = SleepSchedule = {}));
var SmokingHabit;
(function (SmokingHabit) {
    SmokingHabit["NEVER"] = "NEVER";
    SmokingHabit["OCCASIONALLY"] = "OCCASIONALLY";
    SmokingHabit["REGULARLY"] = "REGULARLY";
    SmokingHabit["QUITTING"] = "QUITTING";
    SmokingHabit["NO_PREFERENCE"] = "NO_PREFERENCE";
})(SmokingHabit || (exports.SmokingHabit = SmokingHabit = {}));
var DrinkingHabit;
(function (DrinkingHabit) {
    DrinkingHabit["NEVER"] = "NEVER";
    DrinkingHabit["SOCIALLY"] = "SOCIALLY";
    DrinkingHabit["REGULARLY"] = "REGULARLY";
    DrinkingHabit["NO_PREFERENCE"] = "NO_PREFERENCE";
})(DrinkingHabit || (exports.DrinkingHabit = DrinkingHabit = {}));
var PetPreference;
(function (PetPreference) {
    PetPreference["DOGS"] = "DOGS";
    PetPreference["CATS"] = "CATS";
    PetPreference["OTHER"] = "OTHER";
    PetPreference["NO_PETS"] = "NO_PETS";
    PetPreference["ALLERGIC"] = "ALLERGIC";
    PetPreference["NO_PREFERENCE"] = "NO_PREFERENCE";
})(PetPreference || (exports.PetPreference = PetPreference = {}));
var ExerciseFrequency;
(function (ExerciseFrequency) {
    ExerciseFrequency["NEVER"] = "NEVER";
    ExerciseFrequency["OCCASIONALLY"] = "OCCASIONALLY";
    ExerciseFrequency["REGULARLY"] = "REGULARLY";
    ExerciseFrequency["DAILY"] = "DAILY";
    ExerciseFrequency["NO_PREFERENCE"] = "NO_PREFERENCE";
})(ExerciseFrequency || (exports.ExerciseFrequency = ExerciseFrequency = {}));
var DietPreference;
(function (DietPreference) {
    DietPreference["OMNIVORE"] = "OMNIVORE";
    DietPreference["VEGETARIAN"] = "VEGETARIAN";
    DietPreference["VEGAN"] = "VEGAN";
    DietPreference["HALAL"] = "HALAL";
    DietPreference["KOSHER"] = "KOSHER";
    DietPreference["GLUTEN_FREE"] = "GLUTEN_FREE";
    DietPreference["NO_PREFERENCE"] = "NO_PREFERENCE";
})(DietPreference || (exports.DietPreference = DietPreference = {}));
// ============================================
// Relationship Expectations - 关系期望
// ============================================
var DatingPurpose;
(function (DatingPurpose) {
    DatingPurpose["SERIOUS_RELATIONSHIP"] = "SERIOUS_RELATIONSHIP";
    DatingPurpose["MARRIAGE"] = "MARRIAGE";
    DatingPurpose["CASUAL_DATING"] = "CASUAL_DATING";
    DatingPurpose["FRIENDSHIP_FIRST"] = "FRIENDSHIP_FIRST";
    DatingPurpose["COMPANIONSHIP"] = "COMPANIONSHIP";
    DatingPurpose["NOT_SURE"] = "NOT_SURE";
})(DatingPurpose || (exports.DatingPurpose = DatingPurpose = {}));
var RelationshipPace;
(function (RelationshipPace) {
    RelationshipPace["TAKE_IT_SLOW"] = "TAKE_IT_SLOW";
    RelationshipPace["MODERATE"] = "MODERATE";
    RelationshipPace["READY_TO_COMMIT"] = "READY_TO_COMMIT";
})(RelationshipPace || (exports.RelationshipPace = RelationshipPace = {}));
var LivingArrangement;
(function (LivingArrangement) {
    LivingArrangement["LIVE_ALONE"] = "LIVE_ALONE";
    LivingArrangement["WITH_FAMILY"] = "WITH_FAMILY";
    LivingArrangement["WITH_ROOMMATES"] = "WITH_ROOMMATES";
    LivingArrangement["OPEN_TO_MOVE"] = "OPEN_TO_MOVE";
})(LivingArrangement || (exports.LivingArrangement = LivingArrangement = {}));
var FamilyPlan;
(function (FamilyPlan) {
    FamilyPlan["WANT_CHILDREN"] = "WANT_CHILDREN";
    FamilyPlan["DO_NOT_WANT_CHILDREN"] = "DO_NOT_WANT_CHILDREN";
    FamilyPlan["OPEN_MINDED"] = "OPEN_MINDED";
    FamilyPlan["HAVE_CHILDREN"] = "HAVE_CHILDREN";
    FamilyPlan["NOT_SURE"] = "NOT_SURE";
})(FamilyPlan || (exports.FamilyPlan = FamilyPlan = {}));
// ============================================
// Privacy Settings - 隐私设置
// ============================================
var VisibilityLevel;
(function (VisibilityLevel) {
    VisibilityLevel["PUBLIC"] = "PUBLIC";
    VisibilityLevel["MATCHED_ONLY"] = "MATCHED_ONLY";
    VisibilityLevel["VERIFIED_ONLY"] = "VERIFIED_ONLY";
    VisibilityLevel["PRIVATE"] = "PRIVATE";
})(VisibilityLevel || (exports.VisibilityLevel = VisibilityLevel = {}));
// ============================================
// Field Labels for UI
// ============================================
exports.DATING_AGE_RANGE_LABELS = {
    [AgeRangePreference.UNDER_20]: '20岁以下',
    [AgeRangePreference.AGE_20_25]: '20-25岁',
    [AgeRangePreference.AGE_26_30]: '26-30岁',
    [AgeRangePreference.AGE_31_35]: '31-35岁',
    [AgeRangePreference.AGE_36_40]: '36-40岁',
    [AgeRangePreference.AGE_41_50]: '41-50岁',
    [AgeRangePreference.OVER_50]: '50岁以上',
    [AgeRangePreference.NO_PREFERENCE]: '不限',
};
exports.HEIGHT_RANGE_LABELS = {
    [HeightRange.BELOW_150]: '150cm以下',
    [HeightRange.HEIGHT_150_160]: '150-160cm',
    [HeightRange.HEIGHT_160_170]: '160-170cm',
    [HeightRange.HEIGHT_170_180]: '170-180cm',
    [HeightRange.HEIGHT_180_190]: '180-190cm',
    [HeightRange.ABOVE_190]: '190cm以上',
    [HeightRange.NO_PREFERENCE]: '不限',
};
exports.DATING_EDUCATION_LABELS = {
    [EducationPreference.HIGH_SCHOOL]: '高中及以下',
    [EducationPreference.ASSOCIATE]: '大专',
    [EducationPreference.BACHELOR]: '本科',
    [EducationPreference.MASTER]: '硕士',
    [EducationPreference.DOCTORATE]: '博士',
    [EducationPreference.NO_PREFERENCE]: '不限',
};
exports.INCOME_LABELS = {
    [IncomeRange.BELOW_5K]: '5k以下',
    [IncomeRange.INCOME_5K_10K]: '5k-10k',
    [IncomeRange.INCOME_10K_20K]: '10k-20k',
    [IncomeRange.INCOME_20K_50K]: '20k-50k',
    [IncomeRange.ABOVE_50K]: '50k以上',
    [IncomeRange.NO_PREFERENCE]: '不限',
};
exports.DATING_PURPOSE_LABELS = {
    [DatingPurpose.SERIOUS_RELATIONSHIP]: '认真交往',
    [DatingPurpose.MARRIAGE]: '以结婚为目的',
    [DatingPurpose.CASUAL_DATING]: '轻松约会',
    [DatingPurpose.FRIENDSHIP_FIRST]: '先做朋友',
    [DatingPurpose.COMPANIONSHIP]: '寻找伴侣',
    [DatingPurpose.NOT_SURE]: '顺其自然',
};
exports.VISIBILITY_LABELS = {
    [VisibilityLevel.PUBLIC]: '公开',
    [VisibilityLevel.MATCHED_ONLY]: '匹配后可见',
    [VisibilityLevel.VERIFIED_ONLY]: '认证用户可见',
    [VisibilityLevel.PRIVATE]: '保密',
};
//# sourceMappingURL=dating.js.map