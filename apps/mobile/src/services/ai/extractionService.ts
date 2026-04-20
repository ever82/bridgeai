/**
 * AI Extraction Service Types
 * L3自然语言信息模型 - 提取服务类型定义
 */

/**
 * Extraction result from L3 to L2 conversion
 */
export interface ExtractionResult {
  /** Whether extraction was successful */
  success: boolean;
  /** Extracted L2 structured data */
  data: Record<string, unknown>;
  /** Overall confidence score (0-100) */
  confidence: number;
  /** List of successfully extracted fields */
  fieldsExtracted: string[];
  /** List of fields that failed to extract */
  fieldsFailed: string[];
  /** AI reasoning/analysis */
  reasoning?: string;
  /** LLM provider used */
  provider: 'openai' | 'anthropic' | 'claude' | 'auto';
  /** Model used for extraction */
  model: string;
  /** Extraction latency in milliseconds */
  latencyMs: number;
}

/**
 * Extraction request parameters
 */
export interface ExtractionRequest {
  /** Raw text input */
  text: string;
  /** Scene type */
  scene: string;
  /** Agent ID */
  agentId?: string;
  /** User ID */
  userId?: string;
  /** Previous extraction history */
  previousExtractions?: ExtractionHistoryEntry[];
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * History entry for previous extractions
 */
export interface ExtractionHistoryEntry {
  id: string;
  agentId: string;
  timestamp: Date;
  originalText: string;
  extractedData: Record<string, unknown>;
  confidence: number;
  userConfirmed: boolean;
  /** User corrections if any */
  userCorrections?: Record<string, unknown>;
}

/**
 * Field-level extraction confidence
 */
export interface FieldConfidence {
  field: string;
  confidence: number;
  reasoning: string;
}

/**
 * Demand extraction result (internal use)
 */
export interface DemandExtractionResult {
  id: string;
  rawText: string;
  intent: {
    intent: string;
    confidence: number;
    category: string;
  };
  entities: ExtractedEntity[];
  confidence: number;
  clarificationNeeded: boolean;
  clarificationQuestions: ClarificationQuestion[];
}

/**
 * Extracted entity from text
 */
export interface ExtractedEntity {
  type: string;
  value: string;
  normalizedValue: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

/**
 * Clarification question for missing/confident fields
 */
export interface ClarificationQuestion {
  field: string;
  question: string;
  reason: string;
  suggestedValues?: string[];
}

/**
 * Batch extraction result
 */
export interface BatchExtractionResult {
  success: boolean;
  results: BatchExtractionItem[];
  errors: BatchExtractionError[];
  summary: {
    total: number;
    success: number;
    failed: number;
    successRate: number;
  };
}

/**
 * Single batch extraction item
 */
export interface BatchExtractionItem {
  index: number;
  id: string;
  success: boolean;
  demand?: {
    intent: unknown;
    entities: ExtractedEntity[];
    confidence: number;
  };
  latencyMs?: number;
  error?: string;
}

/**
 * Batch extraction error
 */
export interface BatchExtractionError {
  index: number;
  id: string;
  success: false;
  error: string;
}

/**
 * Extraction confirmation
 */
export interface ExtractionConfirmation {
  extractionId: string;
  confirmed: boolean;
  corrections?: Record<string, unknown>;
  confirmedAt?: string;
}

/**
 * Validation report for extracted data
 */
export interface ValidationReport {
  valid: boolean;
  completenessScore: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  confirmationNeeded: boolean;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}
