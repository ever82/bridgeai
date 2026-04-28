/**
 * VisionShare Supply Extractor
 * VisionShare 供给提取器 - 摄影师/服务提供者的供给信息提取
 */
import { BaseSupplyExtractor } from './baseSupplyExtractor';
import { VisionShareSupplyData, SupplySceneType } from './types';
/**
 * VisionShare Supply Extractor
 * Extracts photographer supply information (equipment, experience, style, pricing)
 */
export declare class VisionShareSupplyExtractor extends BaseSupplyExtractor<VisionShareSupplyData> {
    private readonly sceneTypeValue;
    protected readonly detectionKeywords: string[];
    protected readonly requiredFields: string[];
    protected readonly optionalFields: string[];
    getSceneType(): SupplySceneType;
    /**
     * Extract VisionShare supply data from text
     */
    extract(text: string, _context?: Record<string, any>): Promise<VisionShareSupplyData>;
    /**
     * Extract equipment information
     */
    private extractEquipment;
    /**
     * Extract experience information
     */
    private extractExperience;
    /**
     * Extract style information
     */
    private extractStyle;
    /**
     * Extract pricing information
     */
    private extractPricing;
    /**
     * Extract availability information
     */
    private extractAvailability;
    /**
     * Extract qualification
     */
    private extractQualification;
    /**
     * Calculate overall confidence
     */
    private calculateConfidence;
    protected getClarificationQuestion(field: string): string;
}
//# sourceMappingURL=visionShareSupplyExtractor.d.ts.map