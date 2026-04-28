import { Merchant, MerchantStatus, CreateMerchantInput, UpdateMerchantInput, MerchantFilterOptions, MerchantListResult } from '../types/merchant.types';
/**
 * Create a new merchant
 * Validates that the associated agent is of type AGENTAD
 */
export declare function createMerchant(input: CreateMerchantInput): Promise<Merchant>;
/**
 * Get merchant by ID
 */
export declare function getMerchantById(id: string): Promise<Merchant>;
/**
 * Get merchant by agent ID
 */
export declare function getMerchantByAgentId(agentId: string): Promise<Merchant | null>;
/**
 * Update merchant
 */
export declare function updateMerchant(id: string, input: UpdateMerchantInput): Promise<Merchant>;
/**
 * Delete merchant
 */
export declare function deleteMerchant(id: string): Promise<void>;
/**
 * List merchants with filtering
 */
export declare function listMerchants(options: MerchantFilterOptions): Promise<MerchantListResult>;
/**
 * Update merchant status
 */
export declare function updateMerchantStatus(id: string, status: MerchantStatus): Promise<Merchant>;
/**
 * Get merchant statistics
 */
export declare function getMerchantStats(merchantId: string): Promise<{
    totalOffers: number;
    activeOffers: number;
    totalUsageCount: number;
    lowStockOffers: number;
}>;
//# sourceMappingURL=merchantService.d.ts.map