/**
 * Clarification Service
 * 需求澄清对话服务 - 处理缺失信息的多轮对话交互
 */
import { Demand } from './demandExtractionService';
import { SceneType } from './extractors/types';
/**
 * Clarification Session State
 * 澄清会话状态
 */
export interface ClarificationSession {
    sessionId: string;
    originalDemand: Demand;
    currentDemand: Demand;
    scene: SceneType;
    missingFields: string[];
    clarificationQuestions: string[];
    answeredFields: Record<string, any>;
    clarificationHistory: ClarificationTurn[];
    createdAt: Date;
    updatedAt: Date;
    status: 'active' | 'completed' | 'expired';
    maxTurns: number;
    currentTurn: number;
}
/**
 * Single Clarification Turn
 * 单次澄清轮次
 */
export interface ClarificationTurn {
    turnNumber: number;
    question: string;
    userResponse: string;
    extractedFields: Record<string, any>;
    timestamp: Date;
}
/**
 * Clarification Request
 * 澄清请求
 */
export interface ClarificationRequest {
    sessionId: string;
    userResponse: string;
    context?: {
        previousResponses?: string[];
        userPreferences?: Record<string, any>;
    };
}
/**
 * Clarification Response
 * 澄清响应
 */
export interface ClarificationResponse {
    sessionId: string;
    status: 'clarifying' | 'completed' | 'failed';
    updatedDemand: Demand;
    nextQuestion?: string;
    remainingFields: string[];
    progress: {
        totalFields: number;
        completedFields: number;
        percentage: number;
    };
    clarificationHistory: ClarificationTurn[];
    message?: string;
}
/**
 * Session Store
 * 会话存储接口
 */
interface SessionStore {
    get(sessionId: string): ClarificationSession | undefined;
    set(sessionId: string, session: ClarificationSession): void;
    delete(sessionId: string): void;
    clear(): void;
}
/**
 * Clarification Service
 * 需求澄清服务类
 */
export declare class ClarificationService {
    private sessionStore;
    private readonly defaultMaxTurns;
    constructor(sessionStore?: SessionStore);
    /**
     * Start a new clarification session
     * 启动新的澄清会话
     */
    startClarification(demand: Demand, missingFields?: string[], options?: {
        maxTurns?: number;
        customQuestions?: Record<string, string>;
    }): Promise<ClarificationSession>;
    /**
     * Process user clarification response
     * 处理用户澄清回复
     */
    processClarification(request: ClarificationRequest): Promise<ClarificationResponse>;
    /**
     * Get current clarification session
     * 获取当前澄清会话
     */
    getSession(sessionId: string): ClarificationSession | undefined;
    /**
     * End a clarification session
     * 结束澄清会话
     */
    endSession(sessionId: string): boolean;
    /**
     * Detect missing fields from demand
     * 检测需求中的缺失字段
     */
    detectMissingFields(demand: Demand, scene: SceneType): Promise<string[]>;
    /**
     * Detect generic missing fields (when no scene-specific extractor)
     */
    private detectGenericMissingFields;
    /**
     * Generate clarification questions for missing fields
     * 为缺失字段生成澄清问题
     */
    generateClarificationQuestions(missingFields: string[], scene: SceneType): Promise<string[]>;
    /**
     * Get default clarification question
     */
    private getDefaultClarificationQuestion;
    /**
     * Extract fields from user response
     */
    private extractFieldsFromResponse;
    /**
     * Extract field value from text (generic)
     */
    private extractFieldValue;
    /**
     * Merge extracted fields into demand
     */
    private mergeFieldsIntoDemand;
    /**
     * Check if field exists in object
     */
    private hasField;
    /**
     * Set nested value in object
     */
    private setNestedValue;
    /**
     * Calculate progress
     */
    private calculateProgress;
    /**
     * Generate session ID
     */
    private generateSessionId;
}
export declare const clarificationService: ClarificationService;
/**
 * Stop the singleton's cleanup interval (call in tests to prevent Jest open handle timeout)
 */
export declare function stopSingletonCleanup(): void;
export {};
//# sourceMappingURL=clarificationService.d.ts.map