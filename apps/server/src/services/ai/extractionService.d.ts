/**
 * L3 to L2 Extraction Service
 * 使用 LLM 从自然语言文本中提取结构化 L2 数据
 */
import { L2Data } from '@bridgeai/shared';
import { LLMProvider } from './types';
export interface ExtractionResult {
    success: boolean;
    data: L2Data;
    confidence: number;
    fieldsExtracted: string[];
    fieldsFailed: string[];
    reasoning?: string;
    provider: LLMProvider;
    model: string;
    latencyMs: number;
}
export interface ExtractionRequest {
    text: string;
    scene: string;
    agentId: string;
    userId: string;
    previousExtractions?: ExtractionHistoryEntry[];
}
export interface ExtractionHistoryEntry {
    id: string;
    agentId: string;
    timestamp: Date;
    originalText: string;
    extractedData: L2Data;
    confidence: number;
    userConfirmed: boolean;
    userCorrections?: L2Data;
}
export interface FieldConfidence {
    field: string;
    confidence: number;
    reasoning: string;
}
/**
 * Extract L2 structured data from L3 natural language text
 */
export declare function extractL2FromL3(request: ExtractionRequest): Promise<ExtractionResult>;
/**
 * Re-extract with user corrections
 */
export declare function reExtractWithCorrections(request: ExtractionRequest, userCorrections: L2Data): Promise<ExtractionResult>;
/**
 * Get extraction confidence level
 */
export declare function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low';
/**
 * Get confidence color for UI
 */
export declare function getConfidenceColor(confidence: number): string;
//# sourceMappingURL=extractionService.d.ts.map