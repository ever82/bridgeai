/**
 * Offer Types
 * Types and interfaces for offer management
 */
export declare enum OfferType {
    DISCOUNT = "DISCOUNT",// 折扣 (如8折)
    REDUCTION = "REDUCTION",// 满减 (如满100减20)
    GIFT = "GIFT",// 赠品
    PACKAGE = "PACKAGE",// 套餐
    PERCENTAGE = "PERCENTAGE",// 百分比折扣
    FIXED_AMOUNT = "FIXED_AMOUNT"
}
export declare enum OfferStatus {
    DRAFT = "DRAFT",// 草稿
    PENDING = "PENDING",// 待审核
    ACTIVE = "ACTIVE",// 生效中
    PAUSED = "PAUSED",// 暂停
    EXPIRED = "EXPIRED",// 已过期
    SOLD_OUT = "SOLD_OUT",// 已售罄
    DISABLED = "DISABLED"
}
export declare enum OfferPublishType {
    MANUAL = "MANUAL",// 手动发布
    SCHEDULED = "SCHEDULED",// 定时发布
    IMMEDIATE = "IMMEDIATE"
}
export interface TimeRange {
    start: string;
    end: string;
}
export interface ApplicableScope {
    products?: string[];
    excludedProducts?: string[];
    timeRanges?: TimeRange[];
    storeIds?: string[];
    userGroups?: UserGroup[];
}
export declare enum UserGroup {
    NEW_USER = "NEW_USER",// 新用户
    ALL_USERS = "ALL_USERS",// 所有用户
    VIP = "VIP",// VIP用户
    MEMBER = "MEMBER"
}
export interface AIExtractionData {
    rawText: string;
    extractedFields: {
        type?: OfferType;
        discountValue?: number;
        minPurchaseAmount?: number;
        applicableScope?: ApplicableScope;
        validFrom?: string;
        validUntil?: string;
    };
}
export interface Offer {
    id: string;
    merchantId: string;
    title: string;
    description?: string;
    type: OfferType;
    discountValue?: number;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    applicableScope?: ApplicableScope;
    validFrom: Date;
    validUntil: Date;
    totalStock: number;
    dailyLimit?: number;
    remainingStock: number;
    stockAlertThreshold: number;
    status: OfferStatus;
    publishType: OfferPublishType;
    scheduledPublishAt?: Date;
    aiExtracted: boolean;
    aiExtractionData?: AIExtractionData;
    aiConfidence?: number;
    usageCount: number;
    viewCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateOfferInput {
    merchantId: string;
    title: string;
    description?: string;
    type: OfferType;
    discountValue?: number;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    applicableScope?: ApplicableScope;
    validFrom: Date;
    validUntil: Date;
    totalStock: number;
    dailyLimit?: number;
    stockAlertThreshold?: number;
    publishType?: OfferPublishType;
    scheduledPublishAt?: Date;
}
export interface UpdateOfferInput {
    title?: string;
    description?: string;
    type?: OfferType;
    discountValue?: number;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    applicableScope?: ApplicableScope;
    validFrom?: Date;
    validUntil?: Date;
    totalStock?: number;
    dailyLimit?: number;
    stockAlertThreshold?: number;
    status?: OfferStatus;
    publishType?: OfferPublishType;
    scheduledPublishAt?: Date;
}
export interface OfferFilterOptions {
    merchantId?: string;
    status?: OfferStatus;
    type?: OfferType;
    activeOnly?: boolean;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'validUntil' | 'usageCount';
    sortOrder?: 'asc' | 'desc';
}
export interface OfferListResult {
    offers: Offer[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
export interface StockAlert {
    offerId: string;
    merchantId: string;
    title: string;
    remainingStock: number;
    threshold: number;
}
export interface OfferStatusTransition {
    from: OfferStatus;
    to: OfferStatus[];
}
export declare const VALID_OFFER_STATUS_TRANSITIONS: OfferStatusTransition[];
//# sourceMappingURL=offer.types.d.ts.map