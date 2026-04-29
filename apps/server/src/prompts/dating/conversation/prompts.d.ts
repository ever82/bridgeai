/**
 * Dating Conversation Prompt Templates
 * 约会对话提示模板
 *
 * 为Agent间约会对话生成LLM提示
 */
/**
 * 构建约会对话系统提示
 */
export declare function buildDatingSystemPrompt(agentName: string, persona: {
    personality: string[];
    goals: string[];
    communicationStyle: string;
}, profileSummary: {
    interests: string[];
    personality: string[];
    lifestyle: string[];
    goals: string[];
}, otherProfileSummary: {
    interests: string[];
    personality: string[];
    lifestyle: string[];
    goals: string[];
}): string;
/**
 * 构建话题引导提示
 */
export declare function buildTopicGuidancePrompt(topic: string, category: string, sharedInterests: string[], round: number, previousMessages: string): string;
/**
 * 构建对话质量评估提示
 */
export declare function buildQualityAssessmentPrompt(messages: string, topics: string[], round: number): string;
/**
 * 构建对话摘要生成提示
 */
export declare function buildSummaryPrompt(messages: string, profileA: string, profileB: string): string;
/**
 * 构建安全检查提示
 */
export declare function buildSafetyCheckPrompt(content: string): string;
//# sourceMappingURL=prompts.d.ts.map