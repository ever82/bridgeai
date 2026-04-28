/**
 * Consumer Demand AI Integration
 * 消费者需求 AI 提取集成
 *
 * 集成 AI002 的需求提炼服务，支持自然语言输入
 */
import { ExtractedDemandData } from '@bridgeai/shared';
export { ExtractedDemandData } from '@bridgeai/shared';
/**
 * Extract consumer demand from natural language text
 * 从自然语言文本中提取消费者需求
 *
 * @param text 用户输入的自然语言文本
 * @param context 可选的上下文信息
 * @returns 提取的结构化需求数据
 */
export declare function extractConsumerDemand(text: string, context?: {
    userId?: string;
    location?: {
        latitude: number;
        longitude: number;
    };
    previousContext?: Record<string, any>;
}): Promise<ExtractedDemandData>;
/**
 * Check if clarification is needed based on extracted data
 * 检查是否需要澄清
 *
 * @param extractedData 提取的数据
 * @returns 是否需要澄清
 */
export declare function needsClarification(extractedData: ExtractedDemandData): boolean;
/**
 * Generate clarification questions based on missing data
 * 生成澄清问题
 *
 * @param extractedData 提取的数据
 * @returns 问题列表
 */
export declare function generateClarificationQuestions(extractedData: ExtractedDemandData): string[];
/**
 * Process natural language input for consumer demand
 * 处理消费者需求的自然语言输入
 *
 * This is the main entry point for AI integration
 * 这是 AI 集成的主要入口
 */
export declare function processNaturalLanguageDemand(text: string, options?: {
    userId?: string;
    requireConfirmation?: boolean;
    previousContext?: Record<string, any>;
}): Promise<{
    extractedData: ExtractedDemandData;
    needsClarification: boolean;
    clarificationQuestions?: string[];
    summary: string;
}>;
declare const _default: {
    extractConsumerDemand: typeof extractConsumerDemand;
    needsClarification: typeof needsClarification;
    generateClarificationQuestions: typeof generateClarificationQuestions;
    processNaturalLanguageDemand: typeof processNaturalLanguageDemand;
};
export default _default;
//# sourceMappingURL=consumerDemandAI.d.ts.map