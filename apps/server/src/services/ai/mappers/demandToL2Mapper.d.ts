/**
 * Demand to L2 Mapper
 * 需求结构化映射系统
 * 将提取的需求字段映射到 AgentL2Model 属性
 */
import { L2Schema, L2Data } from '@bridgeai/shared';
import { Demand } from '../demandExtractionService';
/**
 * Mapping Result
 */
export interface MappingResult {
    success: boolean;
    data: L2Data;
    mappedFields: string[];
    unmappedFields: string[];
    inferredFields: string[];
    conflicts: FieldConflict[];
    transformations: FieldTransformation[];
}
/**
 * Field Conflict
 */
export interface FieldConflict {
    field: string;
    values: any[];
    sources: string[];
    resolution?: 'first' | 'last' | 'highest_confidence' | 'manual';
    resolvedValue?: any;
}
/**
 * Field Transformation
 */
export interface FieldTransformation {
    field: string;
    originalValue: any;
    transformedValue: any;
    transformation: string;
}
/**
 * Mapping Rule
 */
export interface MappingRule {
    sourceField: string;
    targetField: string;
    transform?: (value: any) => any;
    condition?: (demand: Demand) => boolean;
    priority: number;
}
/**
 * Scene-specific mapping configuration
 */
export interface SceneMappingConfig {
    scene: string;
    rules: MappingRule[];
    fieldMappings: Record<string, string>;
    enumMappings: Record<string, Record<string, string>>;
}
/**
 * Demand to L2 Mapper Class
 * 需求到L2模型映射器
 */
export declare class DemandToL2Mapper {
    private sceneConfigs;
    private defaultRules;
    constructor();
    /**
     * Map Demand to L2 Data
     * 将提取的需求映射到L2数据结构
     */
    map(demand: Demand, schema: L2Schema): MappingResult;
    /**
     * Map a single field
     */
    private mapField;
    /**
     * Get value from demand structured data
     */
    private getValueFromDemand;
    /**
     * Get default field value mapping
     */
    private getDefaultFieldValue;
    /**
     * Get value from entities
     */
    private getValueFromEntities;
    /**
     * Match entities and raw text to field options (for ENUM/MULTI_SELECT fields)
     */
    private matchEntitiesToFieldOptions;
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
     * Infer field value from demand context
     */
    private inferFieldValue;
    /**
     * Generate title from demand content
     */
    private generateTitle;
    /**
     * Resolve conflicts in mapped data
     */
    private resolveConflicts;
    /**
     * Register scene-specific mapping configuration
     */
    registerSceneConfig(config: SceneMappingConfig): void;
    /**
     * Get scene configuration
     */
    getSceneConfig(scene: string): SceneMappingConfig | undefined;
    /**
     * Initialize default mapping rules
     */
    private initializeDefaultRules;
    /**
     * Add custom mapping rule
     */
    addMappingRule(rule: MappingRule): void;
    /**
     * Validate mapping result against schema
     */
    validateMapping(result: MappingResult, schema: L2Schema): boolean;
}
export declare const demandToL2Mapper: DemandToL2Mapper;
//# sourceMappingURL=demandToL2Mapper.d.ts.map