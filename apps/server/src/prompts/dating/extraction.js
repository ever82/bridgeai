/**
 * Dating Profile Extraction Prompts
 * 约会资料提取提示词模板
 *
 * Provides prompt templates for LLM-powered extraction of dating profile
 * data from natural language text.
 */
/**
 * Build the main extraction prompt for converting natural language
 * to structured dating profile data.
 */
export function buildExtractionPrompt(text, currentProfile) {
    const profileContext = currentProfile
        ? `\n## Current Profile (merge with new extraction):\n${JSON.stringify(currentProfile, null, 2)}\n`
        : '';
    return `You are an expert dating profile extraction system for a Chinese dating/matchmaking platform. Your task is to analyze the user's natural language description and extract structured dating profile information.

## User's Description:
"""${text}"""
${profileContext}
## Instructions:
1. Extract all dating-profile-relevant information from the text.
2. Detect NEGATION patterns: 不要 (don't want), 绝对 (absolutely), 必须 (must), 偏好 (prefer), 不能 (cannot), 不喜欢 (don't like), 拒绝 (refuse), 无法 (unable), 讨厌 (dislike). Mark these as "implicit" preferences with negation=true.
3. Detect EMPHASIS patterns: 最好 (ideally), 一定要 (must have), 优先 (priority), 特别 (especially), 非常 (very). Mark these as "implicit" preferences with emphasis=true.
4. Map extracted values to the enum values where possible.
5. Infer reasonable defaults when context implies a preference even if not stated explicitly.
6. For each extracted field, provide a confidence score (0-100) and source type (explicit/implicit/inferred).

## Enum Values:
- AgeRangePreference: UNDER_20, AGE_20_25, AGE_26_30, AGE_31_35, AGE_36_40, AGE_41_50, OVER_50, NO_PREFERENCE
- HeightRange: BELOW_150, HEIGHT_150_160, HEIGHT_160_170, HEIGHT_170_180, HEIGHT_180_190, ABOVE_190, NO_PREFERENCE
- EducationPreference: HIGH_SCHOOL, ASSOCIATE, BACHELOR, MASTER, DOCTORATE, NO_PREFERENCE
- IncomeRange: BELOW_5K, INCOME_5K_10K, INCOME_10K_20K, INCOME_20K_50K, ABOVE_50K, NO_PREFERENCE
- InterestCategory: SPORTS, MUSIC, READING, TRAVEL, FOOD, MOVIES, GAMING, PHOTOGRAPHY, ARTS, TECH, FASHION, OUTDOOR, PETS, COOKING, DANCING, FITNESS
- PersonalityTrait: INTROVERTED, EXTROVERTED, AMBIVERT, OPTIMISTIC, RATIONAL, EMOTIONAL, PRACTICAL, CREATIVE, ADVENTUROUS, STABLE, HUMOROUS, GENTLE, INDEPENDENT, DEPENDABLE
- DatingPurpose: SERIOUS_RELATIONSHIP, MARRIAGE, CASUAL_DATING, FRIENDSHIP_FIRST, COMPANIONSHIP, NOT_SURE
- SleepSchedule: EARLY_BIRD, NIGHT_OWL, FLEXIBLE, REGULAR
- SmokingHabit: NEVER, OCCASIONALLY, REGULARLY, QUITTING, NO_PREFERENCE
- DrinkingHabit: NEVER, SOCIALLY, REGULARLY, NO_PREFERENCE
- PetPreference: DOGS, CATS, OTHER, NO_PETS, ALLERGIC, NO_PREFERENCE
- ExerciseFrequency: NEVER, OCCASIONALLY, REGULARLY, DAILY, NO_PREFERENCE
- DietPreference: OMNIVORE, VEGETARIAN, VEGAN, HALAL, KOSHER, GLUTEN_FREE, NO_PREFERENCE
- RelationshipPace: TAKE_IT_SLOW, MODERATE, READY_TO_COMMIT
- LivingArrangement: LIVE_ALONE, WITH_FAMILY, WITH_ROOMMATES, OPEN_TO_MOVE
- FamilyPlan: WANT_CHILDREN, DO_NOT_WANT_CHILDREN, OPEN_MINDED, HAVE_CHILDREN, NOT_SURE

## Response Format (JSON):
{
  "basicConditions": {
    "ageRange": "AGE_26_30",
    "heightRange": "HEIGHT_170_180",
    "education": "BACHELOR",
    "income": "INCOME_10K_20K",
    "location": {
      "province": "省",
      "city": "市",
      "district": "区",
      "sameCity": true
    }
  },
  "personality": {
    "traits": ["HUMOROUS", "GENTLE"],
    "preferredTraits": ["OPTIMISTIC", "INDEPENDENT"],
    "dislikedTraits": ["EMOTIONAL"]
  },
  "interests": {
    "interests": [
      {"category": "TRAVEL", "name": "旅游", "level": "passionate"}
    ],
    "preferredInPartner": ["SPORTS", "MOVIES"]
  },
  "lifestyle": {
    "sleepSchedule": "REGULAR",
    "smoking": "NEVER",
    "drinking": "SOCIALLY",
    "pets": "DOGS",
    "exercise": "REGULARLY",
    "workLifeBalance": "balanced",
    "socialFrequency": "moderate"
  },
  "expectations": {
    "purpose": "SERIOUS_RELATIONSHIP",
    "pace": "MODERATE",
    "familyPlan": "OPEN_MINDED",
    "longDistance": "not_preferred"
  },
  "extracted": [
    {
      "category": "age",
      "value": "26-30",
      "confidence": 90,
      "source": "explicit",
      "negation": false,
      "emphasis": false
    }
  ],
  "suggestions": [
    "您可以补充更多关于生活方式的偏好，例如作息时间和宠物喜好"
  ],
  "confidence": 85
}

Respond with ONLY the JSON object, no additional text.`;
}
/**
 * Build prompt for extracting from a self-introduction text.
 * This is optimized for longer-form introductory paragraphs.
 */
export function buildIntroductionExtractionPrompt(introduction) {
    return `You are an expert dating profile analyst. Analyze the following self-introduction and extract key dating profile information.

## Self-Introduction:
"""${introduction}"""

## Instructions:
1. Identify personality traits, interests, lifestyle habits, and relationship expectations from the introduction.
2. Detect implicit preferences - what kind of partner they might be looking for based on their self-description.
3. Detect negation patterns (不要, 绝对, 必须, 不能, 不喜欢, 拒绝, 讨厌) and emphasis patterns (最好, 一定要, 优先, 特别, 非常).
4. Infer personality traits from behavioral descriptions (e.g., "喜欢安静地看书" implies INTROVERTED).
5. Suggest profile fields that could be completed based on the introduction.

## Response Format (JSON):
{
  "personality": {
    "traits": ["PERSONALITY_TRAIT_ENUM"],
    "preferredTraits": ["PERSONALITY_TRAIT_ENUM"],
    "dislikedTraits": ["PERSONALITY_TRAIT_ENUM"]
  },
  "interests": {
    "interests": [
      {"category": "INTEREST_CATEGORY_ENUM", "name": "具体爱好名称", "level": "casual|regular|passionate"}
    ],
    "customInterests": ["自定义爱好"]
  },
  "lifestyle": {
    "sleepSchedule": "SLEEP_SCHEDULE_ENUM",
    "smoking": "SMOKING_HABIT_ENUM",
    "drinking": "DRINKING_HABIT_ENUM",
    "pets": "PET_PREFERENCE_ENUM",
    "exercise": "EXERCISE_FREQUENCY_ENUM",
    "workLifeBalance": "work_focused|balanced|life_focused",
    "socialFrequency": "homebody|moderate|social_butterfly"
  },
  "expectations": {
    "purpose": "DATING_PURPOSE_ENUM",
    "pace": "RELATIONSHIP_PACE_ENUM"
  },
  "extracted": [
    {
      "category": "category_name",
      "value": "extracted_value",
      "confidence": 85,
      "source": "explicit|implicit|inferred",
      "negation": false,
      "emphasis": false,
      "reasoning": "Why this was extracted"
    }
  ],
  "suggestions": [
    "Suggestion for completing the profile"
  ],
  "confidence": 80
}

Respond with ONLY the JSON object, no additional text.`;
}
/**
 * Build prompt for detecting implicit preferences from text.
 * Focuses specifically on negation, emphasis, and inferred preferences.
 */
export function buildImplicitPreferencePrompt(text) {
    return `You are a Chinese-language implicit preference detector for a dating platform. Analyze the text for hidden preferences indicated by negation, emphasis, and contextual clues.

## Text to Analyze:
"""${text}"""

## Instructions:
1. Find all NEGATION patterns: 不要, 绝对不, 必须, 不能, 不喜欢, 拒绝, 无法, 讨厌, 不接受, 绝对不行. These indicate things the user does NOT want.
2. Find all EMPHASIS patterns: 最好, 一定要, 优先, 特别, 非常, 挺看重的, 最重要的是, 关键是. These indicate strong preferences.
3. Find INFERRED preferences - things not explicitly stated but logically implied.
4. For each detected preference, identify the dating profile category it relates to.

## Response Format (JSON):
{
  "negations": [
    {
      "originalText": "original phrase",
      "preference": "what they don't want",
      "category": "personality|lifestyle|expectations|basicConditions|interests",
      "mappedField": "field.path",
      "mappedValue": "ENUM_VALUE or description",
      "confidence": 90
    }
  ],
  "emphases": [
    {
      "originalText": "original phrase",
      "preference": "what they strongly want",
      "category": "personality|lifestyle|expectations|basicConditions|interests",
      "mappedField": "field.path",
      "mappedValue": "ENUM_VALUE or description",
      "confidence": 90
    }
  ],
  "inferred": [
    {
      "reasoning": "Why this preference is inferred",
      "preference": "inferred preference",
      "category": "personality|lifestyle|expectations|basicConditions|interests",
      "mappedField": "field.path",
      "mappedValue": "ENUM_VALUE or description",
      "confidence": 60
    }
  ],
  "summary": "Brief summary of implicit preferences detected"
}

Respond with ONLY the JSON object, no additional text.`;
}
/**
 * Build prompt for generating smart completion suggestions
 * based on a partially-filled dating profile.
 */
export function buildSmartCompletionPrompt(partialProfile, description) {
    return `You are a dating profile advisor. Based on the partial profile data below, suggest smart completions for missing or incomplete fields.

## Partial Profile:
${JSON.stringify(partialProfile, null, 2)}

${description ? `## User Description:\n"""${description}"""\n` : ''}

## Instructions:
1. Identify missing fields that are important for a complete dating profile.
2. For each missing field, provide a suggested value based on context clues from the existing data.
3. Generate specific, actionable suggestions the user can accept or modify.
4. Prioritize suggestions by impact on profile completeness and match potential.

## Response Format (JSON):
{
  "suggestions": [
    {
      "field": "field.path (e.g., basicConditions.education)",
      "currentValue": null,
      "suggestedValue": "suggested enum or value",
      "reasoning": "Why this value is suggested",
      "confidence": 75,
      "priority": "high|medium|low",
      "prompt": "Question to ask the user to confirm (in Chinese)"
    }
  ],
  "missingSections": [
    {
      "section": "section name (e.g., lifestyle, personality)",
      "importance": "high|medium|low",
      "fieldsMissing": 5,
      "suggestedPrompt": "Section-specific prompt to encourage completion (in Chinese)"
    }
  ],
  "overallCompleteness": 45,
  "topPrioritySuggestion": "Most important field to complete next"
}

Respond with ONLY the JSON object, no additional text.`;
}
//# sourceMappingURL=extraction.js.map