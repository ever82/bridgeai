/**
 * Clarification Service
 * 需求澄清对话服务 - 处理缺失信息的多轮对话交互
 */

import { logger } from '../../utils/logger';

import { Demand } from './demandExtractionService';
import { SceneSpecificExtractor, SceneType } from './extractors/types';
import { sceneDetector } from './extractors/sceneDetector';

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
 * In-Memory Session Store
 * 内存会话存储（生产环境应使用Redis等持久化存储）
 */
class InMemorySessionStore implements SessionStore {
  private sessions = new Map<string, ClarificationSession>();
  private readonly maxAgeMs: number;
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(maxAgeMinutes: number = 30, cleanupIntervalMs: number = 5 * 60 * 1000) {
    this.maxAgeMs = maxAgeMinutes * 60 * 1000;
    // Start cleanup interval (disabled if cleanupIntervalMs is 0)
    if (cleanupIntervalMs > 0) {
      this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
    }
  }

  /**
   * Stop the cleanup interval (call in tests to prevent Jest timeout)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  get(sessionId: string): ClarificationSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session && this.isExpired(session)) {
      this.delete(sessionId);
      return undefined;
    }
    return session;
  }

  set(sessionId: string, session: ClarificationSession): void {
    this.sessions.set(sessionId, session);
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  clear(): void {
    this.sessions.clear();
  }

  private isExpired(session: ClarificationSession): boolean {
    return Date.now() - session.updatedAt.getTime() > this.maxAgeMs;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.updatedAt.getTime() > this.maxAgeMs) {
        this.sessions.delete(sessionId);
        logger.info(`Expired clarification session cleaned: ${sessionId}`);
      }
    }
  }
}

/**
 * Clarification Service
 * 需求澄清服务类
 */
export class ClarificationService {
  private sessionStore: SessionStore;
  private readonly defaultMaxTurns = 5;

  constructor(sessionStore?: SessionStore) {
    this.sessionStore = sessionStore || new InMemorySessionStore();
  }

  /**
   * Start a new clarification session
   * 启动新的澄清会话
   */
  async startClarification(
    demand: Demand,
    missingFields?: string[],
    options?: {
      maxTurns?: number;
      customQuestions?: Record<string, string>;
    }
  ): Promise<ClarificationSession> {
    const sessionId = this.generateSessionId();

    // Detect scene if not already set
    const scene = (demand.scene || (await sceneDetector.detectScene(demand.rawText)).scene) as SceneType;

    // Get missing fields
    const fieldsToCheck = missingFields || await this.detectMissingFields(demand, scene);

    // Get extractor for scene
    const extractor = sceneDetector.getExtractor(scene);

    // Generate clarification questions
    let questions: string[] = [];
    if (extractor) {
      questions = extractor.generateClarificationQuestions(fieldsToCheck);
    } else {
      questions = fieldsToCheck.map(field => this.getDefaultClarificationQuestion(field));
    }

    const session: ClarificationSession = {
      sessionId,
      originalDemand: demand,
      currentDemand: { ...demand },
      scene,
      missingFields: fieldsToCheck,
      clarificationQuestions: questions,
      answeredFields: {},
      clarificationHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      maxTurns: options?.maxTurns || this.defaultMaxTurns,
      currentTurn: 0,
    };

    this.sessionStore.set(sessionId, session);

    logger.info('Clarification session started', {
      sessionId,
      scene,
      missingFieldCount: fieldsToCheck.length,
    });

    return session;
  }

  /**
   * Process user clarification response
   * 处理用户澄清回复
   */
  async processClarification(request: ClarificationRequest): Promise<ClarificationResponse> {
    const { sessionId, userResponse } = request;

    // Get session
    const session = this.sessionStore.get(sessionId);
    if (!session) {
      throw new Error(`Clarification session not found or expired: ${sessionId}`);
    }

    // Check if max turns reached
    if (session.currentTurn >= session.maxTurns) {
      session.status = 'completed';
      this.sessionStore.set(sessionId, session);

      return {
        sessionId,
        status: 'completed',
        updatedDemand: session.currentDemand,
        remainingFields: session.missingFields,
        progress: this.calculateProgress(session),
        clarificationHistory: session.clarificationHistory,
        message: '已达到最大对话轮次，澄清会话结束。',
      };
    }

    // Get current question
    const currentQuestion = session.clarificationHistory.length > 0
      ? session.clarificationQuestions[session.clarificationHistory.length]
      : session.clarificationQuestions[0];

    // Extract fields from user response
    const extractedFields = await this.extractFieldsFromResponse(
      userResponse,
      session.missingFields,
      session.scene
    );

    // Update session
    session.currentTurn++;
    session.updatedAt = new Date();

    // Record the turn
    const turn: ClarificationTurn = {
      turnNumber: session.currentTurn,
      question: currentQuestion || '请提供更多信息',
      userResponse,
      extractedFields,
      timestamp: new Date(),
    };
    session.clarificationHistory.push(turn);

    // Update answered fields
    Object.assign(session.answeredFields, extractedFields);

    // Update missing fields
    session.missingFields = session.missingFields.filter(
      field => !this.hasField(session.answeredFields, field)
    );

    // Update demand with new information
    session.currentDemand = await this.mergeFieldsIntoDemand(
      session.currentDemand,
      extractedFields,
      session.scene
    );

    // Check if all fields are answered
    if (session.missingFields.length === 0) {
      session.status = 'completed';
      this.sessionStore.set(sessionId, session);

      return {
        sessionId,
        status: 'completed',
        updatedDemand: session.currentDemand,
        remainingFields: [],
        progress: { totalFields: 0, completedFields: 0, percentage: 100 },
        clarificationHistory: session.clarificationHistory,
        message: '所有信息已收集完成，感谢您的配合！',
      };
    }

    // Get next question
    const nextQuestionIndex = session.clarificationHistory.length;
    const nextQuestion = session.clarificationQuestions[nextQuestionIndex];

    this.sessionStore.set(sessionId, session);

    logger.info('Clarification processed', {
      sessionId,
      turn: session.currentTurn,
      remainingFields: session.missingFields.length,
    });

    return {
      sessionId,
      status: 'clarifying',
      updatedDemand: session.currentDemand,
      nextQuestion,
      remainingFields: session.missingFields,
      progress: this.calculateProgress(session),
      clarificationHistory: session.clarificationHistory,
    };
  }

  /**
   * Get current clarification session
   * 获取当前澄清会话
   */
  getSession(sessionId: string): ClarificationSession | undefined {
    return this.sessionStore.get(sessionId);
  }

  /**
   * End a clarification session
   * 结束澄清会话
   */
  endSession(sessionId: string): boolean {
    const session = this.sessionStore.get(sessionId);
    if (session) {
      session.status = 'completed';
      this.sessionStore.delete(sessionId);
      logger.info('Clarification session ended', { sessionId });
      return true;
    }
    return false;
  }

  /**
   * Detect missing fields from demand
   * 检测需求中的缺失字段
   */
  async detectMissingFields(demand: Demand, scene: SceneType): Promise<string[]> {
    const extractor = sceneDetector.getExtractor(scene);

    if (!extractor) {
      // Return generic missing fields if no extractor found
      return this.detectGenericMissingFields(demand);
    }

    // Build scene data from demand for validation
    const sceneData = {
      scene,
      entities: demand.entities,
      structured: demand.structured as Record<string, any>,
      confidence: demand.confidence,
    };

    const { missingFields } = extractor.validate(sceneData as any);

    return missingFields;
  }

  /**
   * Detect generic missing fields (when no scene-specific extractor)
   */
  private detectGenericMissingFields(demand: Demand): string[] {
    const missing: string[] = [];

    if (!demand.structured.title) {
      missing.push('title');
    }
    if (!demand.structured.location?.city && !demand.structured.location?.address) {
      missing.push('location');
    }
    if (!demand.structured.time?.startTime && !demand.structured.time?.flexibility) {
      missing.push('time');
    }
    if (!demand.structured.budget?.min && !demand.structured.budget?.max) {
      missing.push('budget');
    }

    return missing;
  }

  /**
   * Generate clarification questions for missing fields
   * 为缺失字段生成澄清问题
   */
  async generateClarificationQuestions(
    missingFields: string[],
    scene: SceneType
  ): Promise<string[]> {
    const extractor = sceneDetector.getExtractor(scene);

    if (extractor) {
      return extractor.generateClarificationQuestions(missingFields);
    }

    return missingFields.map(field => this.getDefaultClarificationQuestion(field));
  }

  /**
   * Get default clarification question
   */
  private getDefaultClarificationQuestion(field: string): string {
    const questionMap: Record<string, string> = {
      'title': '请简要描述您的需求标题',
      'location': '请问您希望在哪个城市或地点进行？',
      'location.city': '请问您希望在哪个城市？',
      'time': '请问您期望什么时间进行？',
      'time.startTime': '请问具体的日期和时间是什么？',
      'budget': '请问您的预算范围是多少？',
      'requirements': '请问有什么具体要求吗？',
      'preferences': '请问有什么偏好吗？',
    };

    return questionMap[field] || `请提供关于 "${field}" 的更多信息`;
  }

  /**
   * Extract fields from user response
   */
  private async extractFieldsFromResponse(
    response: string,
    targetFields: string[],
    scene: SceneType
  ): Promise<Record<string, any>> {
    const extracted: Record<string, any> = {};

    // Use scene extractor if available
    const extractor = sceneDetector.getExtractor(scene);
    if (extractor) {
      try {
        const sceneData = await extractor.extract(response);
        return sceneData.structured;
      } catch (error) {
        logger.error('Failed to extract fields from response', { error });
      }
    }

    // Fallback: generic extraction
    for (const field of targetFields) {
      const value = this.extractFieldValue(response, field);
      if (value !== undefined) {
        this.setNestedValue(extracted, field, value);
      }
    }

    return extracted;
  }

  /**
   * Extract field value from text (generic)
   */
  private extractFieldValue(text: string, field: string): any {
    // Budget extraction
    if (field.includes('budget')) {
      const currency = text.includes('$') || text.includes('USD') ? 'USD' : 'CNY';
      const rangeMatch = text.match(/(\d+)\s*[-~到至]\s*(\d+)/);
      if (rangeMatch) {
        return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]), currency };
      }
      const singleMatch = text.match(/(\d+)\s*[元块￥$]/);
      if (singleMatch) {
        return { max: parseInt(singleMatch[1]), currency };
      }
    }

    // Time extraction
    if (field.includes('time') || field.includes('date')) {
      const dateMatch = text.match(/(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/);
      if (dateMatch) {
        return { startTime: dateMatch[1].replace(/[年月]/g, '-').replace(/日/, '') };
      }
    }

    // Location extraction
    if (field.includes('location')) {
      const cityMatch = text.match(/([\u4e00-\u9fa5]{2,5}(?:市|自治州|地区))/);
      if (cityMatch) {
        return { city: cityMatch[1] };
      }
    }

    // Generic string value
    return text.trim();
  }

  /**
   * Merge extracted fields into demand
   */
  private async mergeFieldsIntoDemand(
    demand: Demand,
    fields: Record<string, any>,
    scene: SceneType
  ): Promise<Demand> {
    const updatedDemand: Demand = {
      ...demand,
      structured: {
        ...demand.structured,
      },
    };

    // Deep merge structured data
    for (const [key, value] of Object.entries(fields)) {
      const typedKey = key as keyof Demand['structured'];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        (updatedDemand.structured as any)[typedKey] = {
          ...((updatedDemand.structured as any)[typedKey] || {}),
          ...value,
        };
      } else {
        (updatedDemand.structured as any)[typedKey] = value;
      }
    }

    // Update clarification status
    const remainingFields = await this.detectMissingFields(updatedDemand, scene);
    updatedDemand.clarificationNeeded = remainingFields.length > 0;
    updatedDemand.clarificationQuestions = await this.generateClarificationQuestions(
      remainingFields,
      scene
    );

    return updatedDemand;
  }

  /**
   * Check if field exists in object
   */
  private hasField(obj: Record<string, any>, field: string): boolean {
    const parts = field.split('.');
    let current = obj;

    for (const part of parts) {
      if (current == null || !(part in current)) {
        return false;
      }
      current = current[part];
    }

    if (current == null) return false;
    if (typeof current === 'string' && (current as string).trim() === '') return false;
    if (Array.isArray(current) && current.length === 0) return false;
    if (typeof current === 'object' && Object.keys(current).length === 0) return false;

    return true;
  }

  /**
   * Set nested value in object
   */
  private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Calculate progress
   */
  private calculateProgress(session: ClarificationSession): ClarificationResponse['progress'] {
    const total = session.clarificationQuestions.length;
    const completed = session.clarificationHistory.length;

    return {
      totalFields: total,
      completedFields: completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 100,
    };
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `clar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const clarificationService = new ClarificationService();
