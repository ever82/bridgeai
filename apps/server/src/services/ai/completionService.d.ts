/**
 * Supply Completion Service
 * 供给信息补全服务
 *
 * 功能：
 * - 信息缺失检测
 * - 智能补全建议
 * - 外部数据增强
 * - 默认值推断
 * - 补全确认流程
 */
import { Supply } from './supplyExtractionService';
/**
 * Completion suggestion for a single field
 */
export interface CompletionSuggestion {
    field: string;
    currentValue: any;
    suggestedValue: any;
    confidence: number;
    source: 'inference' | 'default' | 'external' | 'rule';
    reason: string;
    confirmed?: boolean;
}
/**
 * Result of completion analysis
 */
export interface CompletionResult {
    supplyId: string;
    missingFields: string[];
    incompleteFields: string[];
    suggestions: CompletionSuggestion[];
    completenessScore: number;
    appliedDefaults: string[];
    externalQueries: ExternalDataQuery[];
}
/**
 * External data query for enhancement
 */
export interface ExternalDataQuery {
    type: 'certification' | 'market_rate' | 'location' | 'service_type';
    query: string;
    status: 'pending' | 'success' | 'failed';
    result?: any;
}
/**
 * Supply Completion Service Class
 * 供给信息补全服务
 */
export declare class SupplyCompletionService {
    /**
     * Detect incomplete and missing fields in supply data
     */
    detectIncomplete(supply: Supply): {
        missing: string[];
        incomplete: string[];
    };
    /**
     * Generate completion suggestions for incomplete supply data
     */
    generateSuggestions(supply: Supply): CompletionSuggestion[];
    /**
     * Apply confirmed suggestions to supply data
     */
    applySuggestions(supply: Supply, suggestions: CompletionSuggestion[]): Supply;
    /**
     * Query external data for enhancement
     */
    queryExternalData(supply: Supply): ExternalDataQuery[];
    /**
     * Complete the analysis and return full result
     */
    complete(supply: Supply): CompletionResult;
    private inferTitle;
    private inferDescription;
    private inferSkillsFromCapabilities;
    private estimateMarketRate;
}
export declare const supplyCompletionService: SupplyCompletionService;
//# sourceMappingURL=completionService.d.ts.map