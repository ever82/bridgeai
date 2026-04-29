/**
 * Resume Delivery Controller
 *
 * HTTP handlers for resume delivery management
 */
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
/**
 * Create a new delivery
 */
export declare function deliver(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Batch deliver to multiple jobs
 */
export declare function batchDeliverResume(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get my deliveries (seeker view)
 */
export declare function getMyDeliveries(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get my delivery stats
 */
export declare function getMyDeliveryStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get received deliveries (employer view)
 */
export declare function getReceivedDeliveries(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get received delivery stats (employer)
 */
export declare function getReceivedDeliveryStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get single delivery (seeker)
 */
export declare function getMyDelivery(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get single delivery with disclosures (employer)
 */
export declare function getReceivedDelivery(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Update delivery status (employer action)
 */
export declare function updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Withdraw a delivery (seeker action)
 */
export declare function withdraw(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get delivery history
 */
export declare function getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Revoke a disclosure (seeker action)
 */
export declare function revokeField(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=deliveryController.d.ts.map