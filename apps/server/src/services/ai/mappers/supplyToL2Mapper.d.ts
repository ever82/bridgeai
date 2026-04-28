/**
 * Supply to L2 Mapper
 * 供给结构化映射系统
 * 将提取的供给字段映射到 AgentL2Model 属性
 */
import { L2Schema, L2Data } from '@bridgeai/shared';
import { Supply } from '../supplyExtractionService';
/**
 * Mapping Result
 */
export interface SupplyMappingResult {
    success: boolean;
    data: L2Data;
    mappedFields: string[];
    unmappedFields: string[];
    inferredFields: string[];
    conflicts: SupplyFieldConflict[];
    transformations: SupplyFieldTransformation[];
    generatedTags: string[];
}
/**
 * Field Conflict
 */
export interface SupplyFieldConflict {
    field: string;
    values: any[];
    sources: string[];
    resolution?: 'first' | 'last' | 'highest_confidence' | 'manual';
    resolvedValue?: any;
}
/**
 * Field Transformation
 */
export interface SupplyFieldTransformation {
    field: string;
    originalValue: any;
    transformedValue: any;
    transformation: string;
}
/**
 * Mapping Rule
 */
export interface SupplyMappingRule {
    sourceField: string;
    targetField: string;
    transform?: (value: any) => any;
    condition?: (supply: Supply) => boolean;
    priority: number;
}
/**
 * Scene-specific mapping configuration
 */
export interface SupplySceneMappingConfig {
    scene: string;
    rules: SupplyMappingRule[];
    fieldMappings: Record<string, string>;
    enumMappings: Record<string, Record<string, string>>;
}
/**
 * Supply to L2 Mapper Class
 * 供给到L2模型映射器
 */
export declare class SupplyToL2Mapper {
    private sceneConfigs;
    /**
     * Map Supply to L2 Data
     * 将提取的供给映射到L2数据结构
     */
    map(supply: Supply, schema: L2Schema): SupplyMappingResult;
    /**
     * Map a single field
     */
    private mapField;
    /**
     * Get value from supply structured data
     */
    private getValueFromSupply;
    /**
     * Get default field value mapping
     */
    private getDefaultFieldValue;
    /**
     * Get value from capabilities
     */
    private getValueFromCapabilities;
    /**
     * Transform value based on field type
     */
    private transformValue;
    /**
     * Transform number value
     */
    private transformNumber;
    /**
     * Transform enum value
     */
    private transformEnum;
    /**
     * Transform multi-select value
     */
    private transformMultiSelect;
    /**
     * Transform range value
     */
    private transformRange;
    /**
     * Transform boolean value
     */
    private transformBoolean;
    /**
     * Transform datetime value
     */
    private transformDateTime;
    /**
     * Transform text value
     */
    private transformText;
    /**
     * Infer field value from supply context
     */
    private inferFieldValue;
    /**
     * Generate tags from supply data
     */
    private generateTags;
    /**
     * Register scene-specific mapping configuration
     */
    registerSceneConfig(config: SupplySceneMappingConfig): void;
    /**
     * Get scene configuration
     */
    getSceneConfig(scene: string): SupplySceneMappingConfig | undefined;
    /**
     * Validate mapping result against schema
     */
    validateMapping(result: SupplyMappingResult, schema: L2Schema): boolean;
    /**
     * Check if a field value is valid (non-empty meaningful value)
     */
    private isValidFieldValue;
}
export declare const supplyToL2Mapper: SupplyToL2Mapper;
//# sourceMappingURL=supplyToL2Mapper.d.ts.map