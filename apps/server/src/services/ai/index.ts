/**
 * AI Services Index
 * 导出所有AI相关服务
 */

export * from './types';
export * from './adapters';
export { CircuitBreaker, CircuitBreakerManager } from './circuitBreaker';
export { LLMRouter } from './llmRouter';
export { LLMMetricsService } from './metricsService';
export { LLMService } from './llmService';
export * from './fallback';

// Demand Extraction Service (ISSUE-AI002a)
export {
  DemandExtractionService,
  demandExtractionService,
  Demand,
  DemandExtractionRequest,
  ExtractedEntity,
  EntityType,
  IntentResult,
  IntentType,
  ExtractionOptions,
} from './demandExtractionService';

// Demand to L2 Mapper (ISSUE-AI002a)
export {
  DemandToL2Mapper,
  demandToL2Mapper,
  MappingResult,
  FieldConflict,
  FieldTransformation,
  MappingRule,
  SceneMappingConfig,
} from './mappers/demandToL2Mapper';

// Extraction Validator (ISSUE-AI002a)
export {
  ExtractionValidator,
  extractionValidator,
  ValidationReport,
  ValidationIssue,
  ValidationRule,
  ValidationOptions,
  FieldValidationResult,
} from './validators/extractionValidator';

// Scene-Specific Extractors (ISSUE-AI002b)
export {
  SceneType,
  SceneExtractedData,
  SceneExtractedEntity,
  SceneSpecificExtractor,
  SceneDetectionResult,
  VisionShareData,
  AgentDateData,
  AgentJobData,
  AgentAdData,
  BaseSceneExtractor,
  VisionShareExtractor,
  AgentDateExtractor,
  AgentJobExtractor,
  AgentAdExtractor,
  SceneDetector,
  sceneDetector,
} from './extractors';

// Clarification Service (ISSUE-AI002b)
export {
  ClarificationService,
  clarificationService,
  ClarificationSession,
  ClarificationTurn,
  ClarificationRequest,
  ClarificationResponse,
} from './clarificationService';

// Consumer Demand AI Integration (ISSUE-AD001)
export {
  extractConsumerDemand,
  needsClarification,
  generateClarificationQuestions,
  processNaturalLanguageDemand,
  ExtractedDemandData,
} from './consumerDemandAI';

// Supply Extraction Service (ISSUE-AI003)
export {
  SupplyExtractionService,
  supplyExtractionService,
  Supply,
  Capability,
  PricingInfo,
  AvailabilityInfo,
  LocationInfo,
  ExperienceInfo,
  QualityMetrics,
  SupplyExtractionRequest,
  ExtractionOptions as SupplyExtractionOptions,
  SupplyExtractionResult,
  BulkSupplyExtractionRequest,
  BulkSupplyExtractionResult,
  QualityReport,
  QualityIssue,
} from './supplyExtractionService';

// Supply Quality Assessor (ISSUE-AI003)
export {
  SupplyQualityAssessor,
  supplyQualityAssessor,
  SupplyQualityAssessment,
  QualityGrade,
  OptimizationSuggestion,
} from './assessors/supplyQualityAssessor';
