/**
 * Extraction Validator
 * 提取结果验证系统
 * 验证字段完整性、业务规则和合理性
 */
import { L2Schema, L2Data } from '@bridgeai/shared';
import { Demand } from '../demandExtractionService';
/**
 * Validation Rule
 */
export interface ValidationRule {
    id: string;
    name: string;
    description: string;
    condition: (data: L2Data, schema: L2Schema, demand?: Demand) => boolean;
    message: string;
    severity: 'error' | 'warning' | 'info';
    category: 'completeness' | 'business' | 'range' | 'format' | 'logic';
}
/**
 * Validation Context
 */
export interface ValidationContext {
    data: L2Data;
    schema: L2Schema;
    demand?: Demand;
    options?: ValidationOptions;
}
/**
 * Validation Options
 */
export interface ValidationOptions {
    checkCompleteness?: boolean;
    checkBusinessRules?: boolean;
    checkRanges?: boolean;
    checkFormats?: boolean;
    strictMode?: boolean;
    allowPartial?: boolean;
}
/**
 * Validation Report
 */
export interface ValidationReport {
    valid: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
    infos: ValidationIssue[];
    summary: {
        totalIssues: number;
        errorCount: number;
        warningCount: number;
        infoCount: number;
        completenessScore: number;
    };
    suggestions: string[];
    confirmationNeeded: boolean;
    confirmationPrompt?: string;
}
/**
 * Validation Issue
 */
export interface ValidationIssue {
    ruleId: string;
    field?: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    category: string;
    suggestion?: string;
}
/**
 * Field Validation Result
 */
export interface FieldValidationResult {
    field: string;
    valid: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
    value?: any;
}
/**
 * Extraction Validator Class
 * 提取结果验证器
 */
export declare class ExtractionValidator {
    private rules;
    private sceneRules;
    constructor();
    /**
     * Validate extraction result
     * 验证提取结果
     */
    validate(data: L2Data, schema: L2Schema, demand?: Demand, options?: ValidationOptions): ValidationReport;
    /**
     * Validate field completeness
     * 字段完整性检查
     */
    private validateCompleteness;
    /**
     * Validate individual fields
     * 字段级验证
     */
    private validateFields;
    /**
     * Validate field type
     */
    private validateFieldType;
    /**
     * Validate business rules
     * 业务规则验证
     */
    private validateBusinessRules;
    /**
     * Validate ranges
     * 范围验证
     */
    private validateRanges;
    /**
     * Validate formats
     * 格式验证
     */
    private validateFormats;
    /**
     * Apply custom rules
     */
    private applyCustomRules;
    /**
     * Calculate completeness score
     */
    private calculateCompletenessScore;
    /**
     * Determine if user confirmation is needed
     */
    private determineConfirmationNeeded;
    /**
     * Register a custom validation rule
     */
    registerRule(rule: ValidationRule): void;
    /**
     * Register scene-specific rules
     */
    registerSceneRules(scene: string, rules: ValidationRule[]): void;
    /**
     * Get default validation options
     */
    private getDefaultOptions;
    /**
     * Initialize default validation rules
     */
    private initializeDefaultRules;
    /**
     * Validate a single field
     */
    validateField(fieldId: string, value: any, schema: L2Schema): FieldValidationResult;
}
export declare const extractionValidator: ExtractionValidator;
//# sourceMappingURL=extractionValidator.d.ts.map