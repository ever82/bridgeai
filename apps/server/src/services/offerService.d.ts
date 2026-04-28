import { Offer, OfferType, OfferStatus, CreateOfferInput, UpdateOfferInput, OfferFilterOptions, OfferListResult, StockAlert } from '../types/offer.types';
/**
 * Create a new offer
 */
export declare function createOffer(input: CreateOfferInput): Promise<Offer>;
/**
 * Get offer by ID
 */
export declare function getOfferById(id: string): Promise<Offer>;
/**
 * Update offer
 */
export declare function updateOffer(id: string, input: UpdateOfferInput): Promise<Offer>;
/**
 * Delete offer
 */
export declare function deleteOffer(id: string): Promise<void>;
/**
 * List offers with filtering
 */
export declare function listOffers(options: OfferFilterOptions): Promise<OfferListResult>;
/**
 * Update offer status with validation
 */
export declare function updateOfferStatus(id: string, newStatus: OfferStatus): Promise<Offer>;
/**
 * Publish offer (activate from draft/pending)
 */
export declare function publishOffer(id: string): Promise<Offer>;
/**
 * Unpublish offer (disable)
 */
export declare function unpublishOffer(id: string): Promise<Offer>;
/**
 * Pause offer
 */
export declare function pauseOffer(id: string): Promise<Offer>;
/**
 * Resume offer
 */
export declare function resumeOffer(id: string): Promise<Offer>;
/**
 * Check and update expired offers
 * Should be called periodically (e.g., by a cron job)
 */
export declare function checkExpiredOffers(): Promise<number>;
/**
 * Check and activate scheduled offers
 * Should be called periodically
 */
export declare function activateScheduledOffers(): Promise<number>;
/**
 * Deduct stock for an offer
 * Returns true if successful, false if out of stock
 */
export declare function deductStock(offerId: string, quantity?: number): Promise<boolean>;
/**
 * Get offers with low stock
 */
export declare function getLowStockOffers(merchantId?: string): Promise<StockAlert[]>;
/**
 * Increment view count
 */
export declare function incrementViewCount(offerId: string): Promise<void>;
/**
 * Create offer from AI extraction
 */
export declare function createOfferFromAI(merchantId: string, extractedData: {
    title: string;
    description?: string;
    type: OfferType;
    discountValue?: number;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    applicableScope?: any;
    validFrom?: Date;
    validUntil?: Date;
    totalStock?: number;
    confidence: number;
    rawText: string;
}): Promise<Offer>;
//# sourceMappingURL=offerService.d.ts.map