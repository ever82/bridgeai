/**
 * AI Offer Extraction Service
 * Integrates with AI003 to extract offer information from natural language
 */
import { OfferType, ApplicableScope } from '../../types/offer.types';
export interface ExtractedOfferData {
    title: string;
    description?: string;
    type: OfferType;
    discountValue?: number;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    applicableScope?: ApplicableScope;
    validFrom?: Date;
    validUntil?: Date;
    totalStock?: number;
    confidence: number;
    rawText: string;
}
/**
 * Extract offer information from natural language text
 * This is a placeholder implementation that simulates AI extraction
 * In production, this would call the AI003 service
 */
export declare function extractOfferFromText(naturalLanguageText: string): Promise<ExtractedOfferData>;
/**
 * Validate extracted offer data
 */
export declare function validateExtractedData(data: Partial<ExtractedOfferData>): {
    valid: boolean;
    errors: string[];
};
/**
 * Process natural language offer and return structured data
 * This is the main entry point for AI offer extraction
 */
export declare function processNaturalLanguageOffer(naturalLanguageText: string, merchantId: string): Promise<{
    success: boolean;
    data?: ExtractedOfferData;
    errors?: string[];
}>;
//# sourceMappingURL=offerExtractionService.d.ts.map