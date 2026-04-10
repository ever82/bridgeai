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
