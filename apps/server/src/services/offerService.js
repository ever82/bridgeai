import { prisma } from '../db/client';
import { AppError } from '../errors/AppError';
import { OfferType, OfferStatus, OfferPublishType, VALID_OFFER_STATUS_TRANSITIONS, } from '../types/offer.types';
/**
 * Create a new offer
 */
export async function createOffer(input) {
    // Verify the merchant exists
    const merchant = await prisma.merchant.findUnique({
        where: { id: input.merchantId },
    });
    if (!merchant) {
        throw new AppError('Merchant not found', 'MERCHANT_NOT_FOUND', 404);
    }
    // Validate dates
    if (new Date(input.validFrom) >= new Date(input.validUntil)) {
        throw new AppError('Valid until date must be after valid from date', 'INVALID_DATE_RANGE', 400);
    }
    // Validate offer type specific fields
    validateOfferTypeFields(input);
    const offer = await prisma.offer.create({
        data: {
            merchantId: input.merchantId,
            title: input.title,
            description: input.description,
            type: input.type,
            discountValue: input.discountValue || null,
            minPurchaseAmount: input.minPurchaseAmount || null,
            maxDiscountAmount: input.maxDiscountAmount || null,
            applicableScope: input.applicableScope ? JSON.stringify(input.applicableScope) : null,
            validFrom: input.validFrom,
            validUntil: input.validUntil,
            totalStock: input.totalStock,
            remainingStock: input.totalStock,
            dailyLimit: input.dailyLimit || null,
            stockAlertThreshold: input.stockAlertThreshold || 10,
            status: OfferStatus.DRAFT,
            publishType: input.publishType || OfferPublishType.MANUAL,
            scheduledPublishAt: input.scheduledPublishAt || null,
        },
    });
    return mapPrismaOfferToOffer(offer);
}
/**
 * Get offer by ID
 */
export async function getOfferById(id) {
    const offer = await prisma.offer.findUnique({
        where: { id },
        include: {
            merchant: {
                select: {
                    id: true,
                    name: true,
                    agentId: true,
                },
            },
        },
    });
    if (!offer) {
        throw new AppError('Offer not found', 'OFFER_NOT_FOUND', 404);
    }
    return mapPrismaOfferToOffer(offer);
}
/**
 * Update offer
 */
export async function updateOffer(id, input) {
    const existingOffer = await prisma.offer.findUnique({
        where: { id },
    });
    if (!existingOffer) {
        throw new AppError('Offer not found', 'OFFER_NOT_FOUND', 404);
    }
    // Check if offer can be updated based on status
    if (existingOffer.status === OfferStatus.DISABLED) {
        throw new AppError('Cannot update disabled offer', 'OFFER_DISABLED', 400);
    }
    // Validate dates if provided
    if (input.validFrom && input.validUntil) {
        if (new Date(input.validFrom) >= new Date(input.validUntil)) {
            throw new AppError('Valid until date must be after valid from date', 'INVALID_DATE_RANGE', 400);
        }
    }
    // Validate offer type specific fields
    if (input.type || input.discountValue !== undefined) {
        validateOfferTypeFields({
            type: (input.type || existingOffer.type),
            discountValue: (input.discountValue ?? existingOffer.discountValue ?? undefined),
            minPurchaseAmount: (input.minPurchaseAmount ?? existingOffer.minPurchaseAmount ?? undefined),
        });
    }
    const offer = await prisma.offer.update({
        where: { id },
        data: {
            title: input.title,
            description: input.description,
            type: input.type,
            discountValue: input.discountValue != null ? Number(input.discountValue) : undefined,
            minPurchaseAmount: input.minPurchaseAmount != null ? Number(input.minPurchaseAmount) : undefined,
            maxDiscountAmount: input.maxDiscountAmount != null ? Number(input.maxDiscountAmount) : undefined,
            applicableScope: input.applicableScope
                ? JSON.stringify(input.applicableScope)
                : undefined,
            validFrom: input.validFrom,
            validUntil: input.validUntil,
            totalStock: input.totalStock,
            dailyLimit: input.dailyLimit,
            stockAlertThreshold: input.stockAlertThreshold,
            status: input.status,
            publishType: input.publishType,
            scheduledPublishAt: input.scheduledPublishAt,
        },
    });
    return mapPrismaOfferToOffer(offer);
}
/**
 * Delete offer
 */
export async function deleteOffer(id) {
    const existingOffer = await prisma.offer.findUnique({
        where: { id },
    });
    if (!existingOffer) {
        throw new AppError('Offer not found', 'OFFER_NOT_FOUND', 404);
    }
    // Only allow deleting draft or disabled offers
    if (![OfferStatus.DRAFT, OfferStatus.DISABLED].includes(existingOffer.status)) {
        throw new AppError('Can only delete draft or disabled offers', 'CANNOT_DELETE_OFFER', 400);
    }
    await prisma.offer.delete({
        where: { id },
    });
}
/**
 * List offers with filtering
 */
export async function listOffers(options) {
    const { merchantId, status, type, activeOnly = false, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = options;
    const where = {};
    if (merchantId) {
        where.merchantId = merchantId;
    }
    if (status) {
        where.status = status;
    }
    if (type) {
        where.type = type;
    }
    if (activeOnly) {
        where.status = OfferStatus.ACTIVE;
        where.validFrom = { lte: new Date() };
        where.validUntil = { gte: new Date() };
    }
    const orderBy = {};
    orderBy[sortBy] = sortOrder;
    const [offers, total] = await Promise.all([
        prisma.offer.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                merchant: {
                    select: {
                        id: true,
                        name: true,
                        agentId: true,
                    },
                },
            },
        }),
        prisma.offer.count({ where }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
        offers: offers.map(mapPrismaOfferToOffer),
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
}
/**
 * Update offer status with validation
 */
export async function updateOfferStatus(id, newStatus) {
    const existingOffer = await prisma.offer.findUnique({
        where: { id },
    });
    if (!existingOffer) {
        throw new AppError('Offer not found', 'OFFER_NOT_FOUND', 404);
    }
    const currentStatus = existingOffer.status;
    // Validate status transition
    if (!isValidStatusTransition(currentStatus, newStatus)) {
        throw new AppError(`Invalid status transition from ${currentStatus} to ${newStatus}`, 'INVALID_STATUS_TRANSITION', 400);
    }
    // Additional validation for specific transitions
    if (newStatus === OfferStatus.ACTIVE) {
        // Check if offer is within valid date range
        const now = new Date();
        if (new Date(existingOffer.validUntil) < now) {
            throw new AppError('Cannot activate expired offer', 'OFFER_EXPIRED', 400);
        }
        if (existingOffer.remainingStock <= 0) {
            throw new AppError('Cannot activate offer with no stock', 'NO_STOCK', 400);
        }
    }
    const offer = await prisma.offer.update({
        where: { id },
        data: { status: newStatus },
    });
    return mapPrismaOfferToOffer(offer);
}
/**
 * Publish offer (activate from draft/pending)
 */
export async function publishOffer(id) {
    return updateOfferStatus(id, OfferStatus.ACTIVE);
}
/**
 * Unpublish offer (disable)
 */
export async function unpublishOffer(id) {
    return updateOfferStatus(id, OfferStatus.DISABLED);
}
/**
 * Pause offer
 */
export async function pauseOffer(id) {
    return updateOfferStatus(id, OfferStatus.PAUSED);
}
/**
 * Resume offer
 */
export async function resumeOffer(id) {
    return updateOfferStatus(id, OfferStatus.ACTIVE);
}
/**
 * Check and update expired offers
 * Should be called periodically (e.g., by a cron job)
 */
export async function checkExpiredOffers() {
    const now = new Date();
    const result = await prisma.offer.updateMany({
        where: {
            status: OfferStatus.ACTIVE,
            validUntil: { lt: now },
        },
        data: {
            status: OfferStatus.EXPIRED,
        },
    });
    return result.count;
}
/**
 * Check and activate scheduled offers
 * Should be called periodically
 */
export async function activateScheduledOffers() {
    const now = new Date();
    const result = await prisma.offer.updateMany({
        where: {
            status: OfferStatus.DRAFT,
            publishType: OfferPublishType.SCHEDULED,
            scheduledPublishAt: { lte: now },
        },
        data: {
            status: OfferStatus.ACTIVE,
        },
    });
    return result.count;
}
/**
 * Deduct stock for an offer
 * Returns true if successful, false if out of stock
 */
export async function deductStock(offerId, quantity = 1) {
    const offer = await prisma.offer.findUnique({
        where: { id: offerId },
    });
    if (!offer) {
        throw new AppError('Offer not found', 'OFFER_NOT_FOUND', 404);
    }
    if (offer.status !== OfferStatus.ACTIVE) {
        return false;
    }
    if (offer.remainingStock < quantity) {
        return false;
    }
    await prisma.offer.update({
        where: { id: offerId },
        data: {
            remainingStock: offer.remainingStock - quantity,
            usageCount: offer.usageCount + quantity,
        },
    });
    return true;
}
/**
 * Get offers with low stock
 */
export async function getLowStockOffers(merchantId) {
    const where = {
        status: OfferStatus.ACTIVE,
        remainingStock: { gt: 0 },
    };
    if (merchantId) {
        where.merchantId = merchantId;
    }
    const offers = await prisma.offer.findMany({
        where,
        include: {
            merchant: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
    return offers
        .filter((o) => o.remainingStock <= o.stockAlertThreshold)
        .map((o) => ({
        offerId: o.id,
        merchantId: o.merchantId,
        title: o.title,
        remainingStock: o.remainingStock,
        threshold: o.stockAlertThreshold,
    }));
}
/**
 * Increment view count
 */
export async function incrementViewCount(offerId) {
    await prisma.offer.update({
        where: { id: offerId },
        data: {
            viewCount: {
                increment: 1,
            },
        },
    });
}
/**
 * Create offer from AI extraction
 */
export async function createOfferFromAI(merchantId, extractedData) {
    const now = new Date();
    const validFrom = extractedData.validFrom || now;
    const validUntil = extractedData.validUntil || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const offer = await prisma.offer.create({
        data: {
            merchantId,
            title: extractedData.title,
            description: extractedData.description,
            type: extractedData.type,
            discountValue: extractedData.discountValue || null,
            minPurchaseAmount: extractedData.minPurchaseAmount || null,
            maxDiscountAmount: extractedData.maxDiscountAmount || null,
            applicableScope: extractedData.applicableScope
                ? JSON.stringify(extractedData.applicableScope)
                : null,
            validFrom,
            validUntil,
            totalStock: extractedData.totalStock || 100,
            remainingStock: extractedData.totalStock || 100,
            stockAlertThreshold: 10,
            status: OfferStatus.DRAFT,
            publishType: OfferPublishType.MANUAL,
            aiExtracted: true,
            aiConfidence: extractedData.confidence,
            aiExtractionData: JSON.stringify({
                rawText: extractedData.rawText,
                extractedFields: {
                    type: extractedData.type,
                    discountValue: extractedData.discountValue,
                    minPurchaseAmount: extractedData.minPurchaseAmount,
                    applicableScope: extractedData.applicableScope,
                    validFrom,
                    validUntil,
                },
            }),
        },
    });
    return mapPrismaOfferToOffer(offer);
}
/**
 * Validate offer type specific fields
 */
function validateOfferTypeFields(input) {
    if (!input.type)
        return;
    switch (input.type) {
        case OfferType.DISCOUNT:
        case OfferType.PERCENTAGE:
            if (input.discountValue === undefined || input.discountValue <= 0) {
                throw new AppError('Discount value is required for discount/percentage offers', 'MISSING_DISCOUNT_VALUE', 400);
            }
            if (input.discountValue > 100 && input.type === OfferType.PERCENTAGE) {
                throw new AppError('Percentage discount cannot exceed 100%', 'INVALID_PERCENTAGE', 400);
            }
            break;
        case OfferType.REDUCTION:
            if (input.discountValue === undefined || input.discountValue <= 0) {
                throw new AppError('Discount value is required for reduction offers', 'MISSING_DISCOUNT_VALUE', 400);
            }
            if (!input.minPurchaseAmount || input.minPurchaseAmount <= 0) {
                throw new AppError('Minimum purchase amount is required for reduction offers', 'MISSING_MIN_PURCHASE', 400);
            }
            break;
        case OfferType.GIFT:
        case OfferType.PACKAGE:
            // These types don't require discountValue
            break;
        case OfferType.FIXED_AMOUNT:
            if (input.discountValue === undefined || input.discountValue <= 0) {
                throw new AppError('Discount value is required for fixed amount offers', 'MISSING_DISCOUNT_VALUE', 400);
            }
            break;
    }
}
/**
 * Check if status transition is valid
 */
function isValidStatusTransition(currentStatus, newStatus) {
    if (currentStatus === newStatus)
        return true;
    const transition = VALID_OFFER_STATUS_TRANSITIONS.find((t) => t.from === currentStatus);
    return transition?.to.includes(newStatus) || false;
}
/**
 * Map Prisma offer to Offer type
 */
function mapPrismaOfferToOffer(prismaOffer) {
    return {
        id: prismaOffer.id,
        merchantId: prismaOffer.merchantId,
        title: prismaOffer.title,
        description: prismaOffer.description || undefined,
        type: prismaOffer.type,
        discountValue: prismaOffer.discountValue
            ? parseFloat(prismaOffer.discountValue)
            : undefined,
        minPurchaseAmount: prismaOffer.minPurchaseAmount
            ? parseFloat(prismaOffer.minPurchaseAmount)
            : undefined,
        maxDiscountAmount: prismaOffer.maxDiscountAmount
            ? parseFloat(prismaOffer.maxDiscountAmount)
            : undefined,
        applicableScope: prismaOffer.applicableScope
            ? JSON.parse(prismaOffer.applicableScope)
            : undefined,
        validFrom: prismaOffer.validFrom,
        validUntil: prismaOffer.validUntil,
        totalStock: prismaOffer.totalStock,
        dailyLimit: prismaOffer.dailyLimit || undefined,
        remainingStock: prismaOffer.remainingStock,
        stockAlertThreshold: prismaOffer.stockAlertThreshold,
        status: prismaOffer.status,
        publishType: prismaOffer.publishType,
        scheduledPublishAt: prismaOffer.scheduledPublishAt || undefined,
        aiExtracted: prismaOffer.aiExtracted,
        aiExtractionData: prismaOffer.aiExtractionData
            ? JSON.parse(prismaOffer.aiExtractionData)
            : undefined,
        aiConfidence: prismaOffer.aiConfidence || undefined,
        usageCount: prismaOffer.usageCount,
        viewCount: prismaOffer.viewCount,
        createdAt: prismaOffer.createdAt,
        updatedAt: prismaOffer.updatedAt,
    };
}
//# sourceMappingURL=offerService.js.map