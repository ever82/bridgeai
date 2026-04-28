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
export declare function buildExtractionPrompt(text: string, currentProfile?: Record<string, any>): string;
/**
 * Build prompt for extracting from a self-introduction text.
 * This is optimized for longer-form introductory paragraphs.
 */
export declare function buildIntroductionExtractionPrompt(introduction: string): string;
/**
 * Build prompt for detecting implicit preferences from text.
 * Focuses specifically on negation, emphasis, and inferred preferences.
 */
export declare function buildImplicitPreferencePrompt(text: string): string;
/**
 * Build prompt for generating smart completion suggestions
 * based on a partially-filled dating profile.
 */
export declare function buildSmartCompletionPrompt(partialProfile: Record<string, any>, description?: string): string;
//# sourceMappingURL=extraction.d.ts.map