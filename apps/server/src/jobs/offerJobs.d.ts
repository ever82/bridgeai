/**
 * Offer Scheduled Jobs
 * Handles periodic tasks for offer management
 */
/**
 * Check and update expired offers
 * Should be run periodically (e.g., every hour)
 */
export declare function checkExpiredOffersJob(): Promise<void>;
/**
 * Check and activate scheduled offers
 * Should be run periodically (e.g., every minute)
 */
export declare function activateScheduledOffersJob(): Promise<void>;
/**
 * Check for low stock offers and send alerts
 * Should be run periodically (e.g., every 15 minutes)
 */
export declare function checkLowStockOffersJob(): Promise<void>;
/**
 * Run all offer maintenance jobs
 * Can be called from a cron job or scheduled task runner
 */
export declare function runOfferMaintenanceJobs(): Promise<void>;
//# sourceMappingURL=offerJobs.d.ts.map