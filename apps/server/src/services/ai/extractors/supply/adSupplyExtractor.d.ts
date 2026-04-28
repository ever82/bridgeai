/**
 * Ad Supply Extractor
 * AgentAd 供给提取器 - 商家供给信息提取
 */
import { BaseSupplyExtractor } from './baseSupplyExtractor';
import { AdSupplyData, SupplySceneType } from './types';
/**
 * Ad Supply Extractor
 * Extracts merchant/seller supply information (products, offers, inventory)
 */
export declare class AdSupplyExtractor extends BaseSupplyExtractor<AdSupplyData> {
    private readonly sceneTypeValue;
    protected readonly detectionKeywords: string[];
    protected readonly requiredFields: string[];
    protected readonly optionalFields: string[];
    getSceneType(): SupplySceneType;
    /**
     * Extract Ad supply data from text
     */
    extract(text: string, _context?: Record<string, any>): Promise<AdSupplyData>;
    /**
     * Extract products
     */
    private extractProducts;
    /**
     * Extract product condition
     */
    private extractCondition;
    /**
     * Extract product features
     */
    private extractProductFeatures;
    /**
     * Extract offers/promotions
     */
    private extractOffers;
    /**
     * Extract business info
     */
    private extractBusiness;
    /**
     * Extract qualification
     */
    private extractQualification;
    /**
     * Calculate confidence
     */
    private calculateConfidence;
    protected getClarificationQuestion(field: string): string;
}
//# sourceMappingURL=adSupplyExtractor.d.ts.map